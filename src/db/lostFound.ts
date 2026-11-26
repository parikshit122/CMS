import { and, count, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "./index.ts";
import {
  complaintCounters,
  lostFoundClaims,
  lostFoundItems,
  users,
} from "./schema.ts";
import { toNumericId } from "./users.ts";
import {
  evaluateClaimEligibility,
  generateHandoverCode,
  hashHandoverCode,
  scoreVerificationAnswer,
  verifyHandoverCode,
  MAX_CLAIM_ATTEMPTS_PER_ITEM,
} from "./lostFoundRules.ts";

const finderAlias = alias(users, "lf_finder");
const returnedToAlias = alias(users, "lf_returned_to");
const claimantAlias = alias(users, "lf_claimant");
const reviewerAlias = alias(users, "lf_reviewer");

const wrapDbError = (action: string, error: unknown): Error => {
  console.error(`[db/lostFound] ${action} failed:`, error);
  return new Error("Database query failed. Please try again later.", { cause: error });
};

async function nextLostFoundCode(): Promise<string> {
  const year = new Date().getFullYear();
  const key = `lost_found_${year}`;
  const rows = await db
    .insert(complaintCounters)
    .values({ id: key, seq: 1 })
    .onConflictDoUpdate({
      target: complaintCounters.id,
      set: { seq: sql`${complaintCounters.seq} + 1` },
    })
    .returning({ seq: complaintCounters.seq });
  const seq = rows[0]?.seq || 1;
  return `LF-${year}-${String(seq).padStart(4, "0")}`;
}

type ViewerContext = {
  id: number;
  role: string;
};

const isReviewerForItem = (itemFinderId: number, viewer?: ViewerContext | null) => {
  if (!viewer) return false;
  return (
    viewer.id === itemFinderId ||
    viewer.role === "admin" ||
    viewer.role === "staff"
  );
};

export function serializeLostFoundItem(
  row: typeof lostFoundItems.$inferSelect,
  options: {
    finder?: {
      id: number;
      name: string;
      email?: string;
      phone?: string | null;
      role?: string;
      avatar?: string | null;
    } | null;
    returnedTo?: { id: number; name: string } | null;
    viewer?: ViewerContext | null;
    pendingClaimsCount?: number;
    totalClaimsCount?: number;
    myClaimsCount?: number;
    myPendingClaim?: boolean;
    myApprovedClaim?: boolean;
    myLatestClaimStatus?: string | null;
  } = {}
) {
  const canReview = isReviewerForItem(row.finderId, options.viewer);
  const showHandoverCode = Boolean(options.myApprovedClaim && row.status === "approved");
  const canViewFinderEmail = Boolean(canReview || options.myApprovedClaim);
  const canViewContactPhone = Boolean(options.viewer);
  const resolvedContactPhone = (row.contactPhone || options.finder?.phone || "").trim();

  const payload: Record<string, unknown> = {
    _id: String(row.id),
    id: row.id,
    itemCode: row.itemCode,
    title: row.title,
    description: row.description,
    category: row.category,
    foundLocation: row.foundLocation,
    foundAt: row.foundAt,
    custodyType: row.custodyType,
    custodyLocation: row.custodyLocation || "",
    hasContactPhone: Boolean(resolvedContactPhone),
    // Authenticated campus members can initiate a WhatsApp/phone chat from Item Details
    ...(canViewContactPhone && resolvedContactPhone
      ? { contactPhone: resolvedContactPhone }
      : {}),
    imageUrl: row.imageUrl || "",
    blurImagePublicly: row.blurImagePublicly,
    verificationQuestion: row.verificationQuestion,
    status: row.status,
    mapNodeId: row.mapNodeId ?? null,
    isDemoRecord: Boolean(row.isDemoRecord),
    finderId: row.finderId,
    finder: options.finder
      ? {
          _id: String(options.finder.id),
          id: options.finder.id,
          name: options.finder.name,
          role: options.finder.role || "user",
          avatar: options.finder.avatar || "",
          ...(canViewFinderEmail ? { email: options.finder.email } : {}),
          ...(canViewContactPhone && resolvedContactPhone
            ? { phone: resolvedContactPhone }
            : {}),
        }
      : { _id: String(row.finderId), id: row.finderId, name: "Campus Member" },
    approvedClaimId: row.approvedClaimId ?? null,
    returnedTo: options.returnedTo
      ? { _id: String(options.returnedTo.id), id: options.returnedTo.id, name: options.returnedTo.name }
      : null,
    returnedAt: row.returnedAt ?? null,
    pendingClaimsCount: options.pendingClaimsCount ?? 0,
    totalClaimsCount: options.totalClaimsCount ?? 0,
    myClaimsCount: options.myClaimsCount ?? 0,
    myRemainingAttempts: Math.max(
      0,
      MAX_CLAIM_ATTEMPTS_PER_ITEM - (options.myClaimsCount ?? 0)
    ),
    myPendingClaim: Boolean(options.myPendingClaim),
    myApprovedClaim: Boolean(options.myApprovedClaim),
    myLatestClaimStatus: options.myLatestClaimStatus ?? null,
    canReview,
    isFinder: Boolean(options.viewer && options.viewer.id === row.finderId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  // STRICT SERVER-SIDE PRIVACY BOUNDARY:
  // Expected verification secret & private finder notes are NEVER exposed to public claimants.
  if (canReview) {
    payload.verificationAnswerSecret = row.verificationAnswerSecret;
    payload.privateNotes = row.privateNotes || "";
  }

  // Handover pickup code is ONLY shown to the verified approved claimant.
  if (showHandoverCode && row.handoverCodePlain) {
    payload.handoverCode = row.handoverCodePlain;
  }

  return payload;
}

export async function getAllActiveUserIds(excludeUserId?: number): Promise<number[]> {
  try {
    const conditions = [eq(users.isActive, true)];
    if (excludeUserId) {
      conditions.push(ne(users.id, excludeUserId));
    }
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(and(...conditions));
    return rows.map((r) => r.id);
  } catch (error) {
    throw wrapDbError("getAllActiveUserIds", error);
  }
}

export async function getUserFraudStrikeCount(userId: unknown): Promise<number> {
  const numId = toNumericId(userId);
  if (!numId) return 0;
  try {
    const rows = await db
      .select({ value: count() })
      .from(lostFoundClaims)
      .where(
        and(
          eq(lostFoundClaims.claimantId, numId),
          eq(lostFoundClaims.isFlaggedFraud, true)
        )
      );
    return Number(rows[0]?.value || 0);
  } catch (error) {
    throw wrapDbError("getUserFraudStrikeCount", error);
  }
}

export async function createLostFoundItem(data: {
  title: string;
  description: string;
  category: string;
  foundLocation: string;
  foundAt?: Date;
  custodyType?: string;
  custodyLocation?: string;
  contactPhone?: string;
  imageUrl?: string;
  imagePublicId?: string;
  blurImagePublicly?: boolean;
  verificationQuestion: string;
  verificationAnswerSecret: string;
  privateNotes?: string;
  mapNodeId?: unknown;
  finderId: unknown;
}) {
  const numFinder = toNumericId(data.finderId);
  if (!numFinder) throw new Error("Invalid finder ID");
  try {
    const itemCode = await nextLostFoundCode();
    const rows = await db
      .insert(lostFoundItems)
      .values({
        itemCode,
        title: data.title.trim(),
        description: data.description.trim(),
        category: data.category.toLowerCase().trim(),
        foundLocation: data.foundLocation.trim(),
        foundAt: data.foundAt || new Date(),
        custodyType: data.custodyType || "finder",
        custodyLocation: (data.custodyLocation || "").trim(),
        contactPhone: (data.contactPhone || "").trim(),
        imageUrl: data.imageUrl || "",
        imagePublicId: data.imagePublicId || "",
        blurImagePublicly: data.blurImagePublicly !== false,
        verificationQuestion: data.verificationQuestion.trim(),
        verificationAnswerSecret: data.verificationAnswerSecret.trim(),
        privateNotes: (data.privateNotes || "").trim(),
        mapNodeId: toNumericId(data.mapNodeId),
        status: "open",
        finderId: numFinder,
      })
      .returning();

    const finderRows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        avatar: users.avatar,
      })
      .from(users)
      .where(eq(users.id, numFinder))
      .limit(1);

    return serializeLostFoundItem(rows[0], {
      finder: finderRows[0] || null,
      viewer: { id: numFinder, role: finderRows[0]?.role || "user" },
    });
  } catch (error) {
    throw wrapDbError("createLostFoundItem", error);
  }
}

export async function listLostFoundItems(params: {
  viewer: ViewerContext;
  status?: string;
  category?: string;
  search?: string;
  scope?: string; // "all" | "my_posts" | "my_claims" | "flagged"
}) {
  try {
    const conditions = [];

    if (params.status && params.status !== "all") {
      conditions.push(eq(lostFoundItems.status, params.status));
    } else {
      conditions.push(ne(lostFoundItems.status, "archived"));
    }

    if (params.category && params.category !== "all") {
      conditions.push(eq(lostFoundItems.category, params.category.toLowerCase()));
    }

    if (params.search && params.search.trim()) {
      const term = `%${params.search.trim()}%`;
      conditions.push(
        or(
          ilike(lostFoundItems.title, term),
          ilike(lostFoundItems.description, term),
          ilike(lostFoundItems.foundLocation, term),
          ilike(lostFoundItems.itemCode, term)
        )
      );
    }

    if (params.scope === "my_posts") {
      conditions.push(eq(lostFoundItems.finderId, params.viewer.id));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        item: lostFoundItems,
        finder: {
          id: finderAlias.id,
          name: finderAlias.name,
          email: finderAlias.email,
          phone: finderAlias.phone,
          role: finderAlias.role,
          avatar: finderAlias.avatar,
        },
        returnedTo: {
          id: returnedToAlias.id,
          name: returnedToAlias.name,
        },
      })
      .from(lostFoundItems)
      .leftJoin(finderAlias, eq(lostFoundItems.finderId, finderAlias.id))
      .leftJoin(returnedToAlias, eq(lostFoundItems.returnedToId, returnedToAlias.id))
      .where(whereClause)
      .orderBy(desc(lostFoundItems.createdAt))
      .limit(100);

    // Fetch claim aggregates + viewer's claim state in a single query
    const claimRows = await db
      .select({
        itemId: lostFoundClaims.itemId,
        claimantId: lostFoundClaims.claimantId,
        status: lostFoundClaims.status,
        isFlaggedFraud: lostFoundClaims.isFlaggedFraud,
        createdAt: lostFoundClaims.createdAt,
      })
      .from(lostFoundClaims)
      .orderBy(desc(lostFoundClaims.createdAt));

    const statsByItem = new Map<
      number,
      {
        pending: number;
        total: number;
        myCount: number;
        myPending: boolean;
        myApproved: boolean;
        myLatestStatus: string | null;
        hasFraud: boolean;
      }
    >();

    for (const c of claimRows) {
      let entry = statsByItem.get(c.itemId);
      if (!entry) {
        entry = {
          pending: 0,
          total: 0,
          myCount: 0,
          myPending: false,
          myApproved: false,
          myLatestStatus: null,
          hasFraud: false,
        };
        statsByItem.set(c.itemId, entry);
      }
      entry.total += 1;
      if (c.status === "pending") entry.pending += 1;
      if (c.isFlaggedFraud) entry.hasFraud = true;
      if (c.claimantId === params.viewer.id) {
        entry.myCount += 1;
        if (c.status === "pending") entry.myPending = true;
        if (c.status === "approved") entry.myApproved = true;
        if (!entry.myLatestStatus) entry.myLatestStatus = c.status;
      }
    }

    let formatted = rows.map(({ item, finder, returnedTo }) => {
      const st = statsByItem.get(item.id);
      return serializeLostFoundItem(item, {
        finder: finder?.id ? finder : null,
        returnedTo: returnedTo?.id ? returnedTo : null,
        viewer: params.viewer,
        pendingClaimsCount: st?.pending ?? 0,
        totalClaimsCount: st?.total ?? 0,
        myClaimsCount: st?.myCount ?? 0,
        myPendingClaim: st?.myPending ?? false,
        myApprovedClaim: st?.myApproved ?? false,
        myLatestClaimStatus: st?.myLatestStatus ?? null,
      });
    });

    if (params.scope === "my_claims") {
      formatted = formatted.filter((it) => Number(it.myClaimsCount) > 0);
    } else if (params.scope === "flagged" && params.viewer.role === "admin") {
      formatted = formatted.filter((it) => statsByItem.get(Number(it.id))?.hasFraud);
    }

    return formatted;
  } catch (error) {
    throw wrapDbError("listLostFoundItems", error);
  }
}

export async function getLostFoundItemById(id: unknown, viewer?: ViewerContext | null) {
  const numId = toNumericId(id);
  if (!numId) return null;
  try {
    const rows = await db
      .select({
        item: lostFoundItems,
        finder: {
          id: finderAlias.id,
          name: finderAlias.name,
          email: finderAlias.email,
          phone: finderAlias.phone,
          role: finderAlias.role,
          avatar: finderAlias.avatar,
        },
        returnedTo: {
          id: returnedToAlias.id,
          name: returnedToAlias.name,
        },
      })
      .from(lostFoundItems)
      .leftJoin(finderAlias, eq(lostFoundItems.finderId, finderAlias.id))
      .leftJoin(returnedToAlias, eq(lostFoundItems.returnedToId, returnedToAlias.id))
      .where(eq(lostFoundItems.id, numId))
      .limit(1);

    if (!rows[0]) return null;
    const { item, finder, returnedTo } = rows[0];

    const claims = await db
      .select({
        claimantId: lostFoundClaims.claimantId,
        status: lostFoundClaims.status,
      })
      .from(lostFoundClaims)
      .where(eq(lostFoundClaims.itemId, numId))
      .orderBy(desc(lostFoundClaims.createdAt));

    let pending = 0;
    let myCount = 0;
    let myPending = false;
    let myApproved = false;
    let myLatestStatus: string | null = null;

    for (const c of claims) {
      if (c.status === "pending") pending += 1;
      if (viewer && c.claimantId === viewer.id) {
        myCount += 1;
        if (c.status === "pending") myPending = true;
        if (c.status === "approved") myApproved = true;
        if (!myLatestStatus) myLatestStatus = c.status;
      }
    }

    return {
      raw: item,
      serialized: serializeLostFoundItem(item, {
        finder: finder?.id ? finder : null,
        returnedTo: returnedTo?.id ? returnedTo : null,
        viewer,
        pendingClaimsCount: pending,
        totalClaimsCount: claims.length,
        myClaimsCount: myCount,
        myPendingClaim: myPending,
        myApprovedClaim: myApproved,
        myLatestClaimStatus: myLatestStatus,
      }),
    };
  } catch (error) {
    throw wrapDbError("getLostFoundItemById", error);
  }
}

export async function createLostFoundClaim(params: {
  itemId: unknown;
  claimantId: unknown;
  verificationAnswer: string;
  identifyingDetails: string;
  lostLocation?: string;
  claimantPhone?: string;
  proofImageUrl?: string;
  proofImagePublicId?: string;
  honestyPledgeAccepted: boolean;
}) {
  const numItemId = toNumericId(params.itemId);
  const numClaimantId = toNumericId(params.claimantId);
  if (!numItemId || !numClaimantId) {
    throw new Error("Invalid item or user ID");
  }

  try {
    const itemRows = await db
      .select()
      .from(lostFoundItems)
      .where(eq(lostFoundItems.id, numItemId))
      .limit(1);

    const item = itemRows[0];
    if (!item) {
      return { error: { status: 404, message: "Found item not found." } };
    }

    const [priorClaims, userFraudStrikes] = await Promise.all([
      db
        .select({
          id: lostFoundClaims.id,
          status: lostFoundClaims.status,
        })
        .from(lostFoundClaims)
        .where(
          and(
            eq(lostFoundClaims.itemId, numItemId),
            eq(lostFoundClaims.claimantId, numClaimantId)
          )
        ),
      getUserFraudStrikeCount(numClaimantId),
    ]);

    const eligibility = evaluateClaimEligibility({
      userId: numClaimantId,
      finderId: item.finderId,
      itemStatus: item.status,
      priorAttempts: priorClaims.length,
      hasPendingClaim: priorClaims.some((c) => c.status === "pending"),
      userFraudStrikes,
    });

    if (!eligibility.allowed) {
      return {
        error: {
          status: 403,
          code: eligibility.code,
          message: eligibility.reason || "You are not eligible to claim this item.",
        },
      };
    }

    const match = scoreVerificationAnswer(
      item.verificationAnswerSecret,
      params.verificationAnswer
    );

    const inserted = await db
      .insert(lostFoundClaims)
      .values({
        itemId: numItemId,
        claimantId: numClaimantId,
        attemptNumber: priorClaims.length + 1,
        verificationAnswer: params.verificationAnswer.trim(),
        identifyingDetails: params.identifyingDetails.trim(),
        lostLocation: (params.lostLocation || "").trim(),
        claimantPhone: (params.claimantPhone || "").trim(),
        proofImageUrl: params.proofImageUrl || "",
        proofImagePublicId: params.proofImagePublicId || "",
        honestyPledgeAccepted: Boolean(params.honestyPledgeAccepted),
        answerMatchScore: match.score,
        answerMatchLevel: match.level,
        status: "pending",
        isFlaggedFraud: false,
      })
      .returning();

    if (item.status === "open") {
      await db
        .update(lostFoundItems)
        .set({ status: "claim_pending", updatedAt: new Date() })
        .where(eq(lostFoundItems.id, numItemId));
    }

    const claim = inserted[0];

    // Return sanitized claim to claimant (NEVER leak answerMatchScore or expected secret!)
    return {
      claim: {
        _id: String(claim.id),
        id: claim.id,
        itemId: claim.itemId,
        attemptNumber: claim.attemptNumber,
        remainingAttempts: Math.max(0, MAX_CLAIM_ATTEMPTS_PER_ITEM - claim.attemptNumber),
        status: claim.status,
        createdAt: claim.createdAt,
      },
      item,
      match,
    };
  } catch (error) {
    throw wrapDbError("createLostFoundClaim", error);
  }
}

export async function getClaimsForItem(itemId: unknown, viewer: ViewerContext) {
  const numItemId = toNumericId(itemId);
  if (!numItemId) return null;
  try {
    const itemRows = await db
      .select()
      .from(lostFoundItems)
      .where(eq(lostFoundItems.id, numItemId))
      .limit(1);

    const item = itemRows[0];
    if (!item) return null;

    const canReview = isReviewerForItem(item.finderId, viewer);

    const conditions = [eq(lostFoundClaims.itemId, numItemId)];
    if (!canReview) {
      // Regular claimants can ONLY view their own claim history on this item
      conditions.push(eq(lostFoundClaims.claimantId, viewer.id));
    }

    const rows = await db
      .select({
        claim: lostFoundClaims,
        claimant: {
          id: claimantAlias.id,
          name: claimantAlias.name,
          email: claimantAlias.email,
          phone: claimantAlias.phone,
          course: claimantAlias.course,
          year: claimantAlias.year,
          role: claimantAlias.role,
          avatar: claimantAlias.avatar,
        },
        reviewer: {
          id: reviewerAlias.id,
          name: reviewerAlias.name,
        },
      })
      .from(lostFoundClaims)
      .leftJoin(claimantAlias, eq(lostFoundClaims.claimantId, claimantAlias.id))
      .leftJoin(reviewerAlias, eq(lostFoundClaims.reviewerId, reviewerAlias.id))
      .where(and(...conditions))
      .orderBy(desc(lostFoundClaims.createdAt));

    // Look up fraud strike counts per claimant for reviewers
    const fraudCounts = new Map<number, number>();
    if (canReview && rows.length > 0) {
      const fraudAgg = await db
        .select({
          claimantId: lostFoundClaims.claimantId,
          strikes: sql<number>`count(*)::int`,
        })
        .from(lostFoundClaims)
        .where(eq(lostFoundClaims.isFlaggedFraud, true))
        .groupBy(lostFoundClaims.claimantId);
      for (const r of fraudAgg) {
        fraudCounts.set(r.claimantId, Number(r.strikes || 0));
      }
    }

    return {
      canReview,
      expectedAnswer: canReview ? item.verificationAnswerSecret : undefined,
      privateNotes: canReview ? item.privateNotes || "" : undefined,
      claims: rows.map(({ claim, claimant, reviewer }) => ({
        _id: String(claim.id),
        id: claim.id,
        itemId: claim.itemId,
        attemptNumber: claim.attemptNumber,
        verificationAnswer: claim.verificationAnswer,
        identifyingDetails: claim.identifyingDetails,
        lostLocation: claim.lostLocation || "",
        claimantPhone: (claim.claimantPhone || claimant?.phone || "").trim(),
        proofImageUrl: claim.proofImageUrl || "",
        honestyPledgeAccepted: claim.honestyPledgeAccepted,
        // Match score is a private anti-fraud signal visible ONLY to reviewers
        ...(canReview
          ? {
              answerMatchScore: claim.answerMatchScore,
              answerMatchLevel: claim.answerMatchLevel,
              claimantFraudStrikes: fraudCounts.get(claim.claimantId) || 0,
            }
          : {}),
        status: claim.status,
        isFlaggedFraud: claim.isFlaggedFraud,
        reviewNote: claim.reviewNote || "",
        reviewedAt: claim.reviewedAt ?? null,
        reviewer: reviewer?.id ? { id: reviewer.id, name: reviewer.name } : null,
        claimant: claimant?.id
          ? {
              _id: String(claimant.id),
              id: claimant.id,
              name: claimant.name,
              email: claimant.email,
              phone: (claim.claimantPhone || claimant.phone || "").trim(),
              course: claimant.course || "",
              year: claimant.year || "",
              role: claimant.role,
              avatar: claimant.avatar || "",
            }
          : null,
        createdAt: claim.createdAt,
      })),
    };
  } catch (error) {
    throw wrapDbError("getClaimsForItem", error);
  }
}

export async function reviewLostFoundClaim(params: {
  claimId: unknown;
  reviewer: ViewerContext;
  decision: "approve" | "reject" | "flag_fraud";
  reviewNote?: string;
}) {
  const numClaimId = toNumericId(params.claimId);
  if (!numClaimId) {
    return { error: { status: 400, message: "Invalid claim ID." } };
  }

  try {
    const rows = await db
      .select({
        claim: lostFoundClaims,
        item: lostFoundItems,
      })
      .from(lostFoundClaims)
      .innerJoin(lostFoundItems, eq(lostFoundClaims.itemId, lostFoundItems.id))
      .where(eq(lostFoundClaims.id, numClaimId))
      .limit(1);

    if (!rows[0]) {
      return { error: { status: 404, message: "Claim not found." } };
    }

    const { claim, item } = rows[0];

    if (!isReviewerForItem(item.finderId, params.reviewer)) {
      return {
        error: {
          status: 403,
          message: "Only the finder or campus staff/admin can review claims on this item.",
        },
      };
    }

    if (claim.status !== "pending") {
      return {
        error: { status: 400, message: "This claim has already been reviewed." },
      };
    }

    const now = new Date();
    const note = (params.reviewNote || "").trim();

    if (params.decision === "approve") {
      if (item.status === "returned" || item.status === "approved") {
        return {
          error: {
            status: 400,
            message: "Another claim has already been approved for this item.",
          },
        };
      }

      const handoverCode = generateHandoverCode();
      const handoverHash = hashHandoverCode(handoverCode);

      await db
        .update(lostFoundClaims)
        .set({
          status: "approved",
          reviewerId: params.reviewer.id,
          reviewNote: note || "Ownership verified. Present pickup code at handover.",
          reviewedAt: now,
          updatedAt: now,
        })
        .where(eq(lostFoundClaims.id, claim.id));

      // Reject any other pending claims on this item politely
      await db
        .update(lostFoundClaims)
        .set({
          status: "rejected",
          reviewerId: params.reviewer.id,
          reviewNote: "Another claimant's ownership proof was verified for this item.",
          reviewedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(lostFoundClaims.itemId, item.id),
            eq(lostFoundClaims.status, "pending"),
            ne(lostFoundClaims.id, claim.id)
          )
        );

      await db
        .update(lostFoundItems)
        .set({
          status: "approved",
          approvedClaimId: claim.id,
          handoverCodeHash: handoverHash,
          handoverCodePlain: handoverCode,
          updatedAt: now,
        })
        .where(eq(lostFoundItems.id, item.id));

      return {
        decision: "approve",
        item,
        claim,
        handoverCode,
      };
    }

    const isFraud = params.decision === "flag_fraud";
    await db
      .update(lostFoundClaims)
      .set({
        status: isFraud ? "fraud_flagged" : "rejected",
        isFlaggedFraud: isFraud,
        reviewerId: params.reviewer.id,
        reviewNote:
          note ||
          (isFraud
            ? "Flagged as a false/fraudulent ownership appeal and reported to Campus Administration."
            : "Verification details did not match the found item."),
        reviewedAt: now,
        updatedAt: now,
      })
      .where(eq(lostFoundClaims.id, claim.id));

    // If no other pending claims remain, move item back to "open"
    const remainingPending = await db
      .select({ value: count() })
      .from(lostFoundClaims)
      .where(
        and(
          eq(lostFoundClaims.itemId, item.id),
          eq(lostFoundClaims.status, "pending")
        )
      );

    if (Number(remainingPending[0]?.value || 0) === 0 && item.status === "claim_pending") {
      await db
        .update(lostFoundItems)
        .set({ status: "open", updatedAt: now })
        .where(eq(lostFoundItems.id, item.id));
    }

    const updatedStrikes = isFraud
      ? await getUserFraudStrikeCount(claim.claimantId)
      : 0;

    return {
      decision: params.decision,
      item,
      claim,
      claimantFraudStrikes: updatedStrikes,
    };
  } catch (error) {
    throw wrapDbError("reviewLostFoundClaim", error);
  }
}

export async function completeLostFoundHandover(params: {
  itemId: unknown;
  verifier: ViewerContext;
  handoverCode: string;
}) {
  const numItemId = toNumericId(params.itemId);
  if (!numItemId) {
    return { error: { status: 400, message: "Invalid item ID." } };
  }

  try {
    const itemRows = await db
      .select()
      .from(lostFoundItems)
      .where(eq(lostFoundItems.id, numItemId))
      .limit(1);

    const item = itemRows[0];
    if (!item) {
      return { error: { status: 404, message: "Found item not found." } };
    }

    if (!isReviewerForItem(item.finderId, params.verifier)) {
      return {
        error: {
          status: 403,
          message: "Only the finder or campus staff/admin can confirm handover.",
        },
      };
    }

    if (item.status !== "approved" || !item.approvedClaimId) {
      return {
        error: {
          status: 400,
          message: "This item does not have an approved claim ready for handover.",
        },
      };
    }

    if (!verifyHandoverCode(params.handoverCode, item.handoverCodeHash)) {
      return {
        error: {
          status: 400,
          message: "Invalid handover pickup code. Ask the verified owner to show their 6-character code.",
        },
      };
    }

    const claimRows = await db
      .select()
      .from(lostFoundClaims)
      .where(eq(lostFoundClaims.id, item.approvedClaimId))
      .limit(1);

    const approvedClaim = claimRows[0];
    const now = new Date();

    await db
      .update(lostFoundClaims)
      .set({ status: "completed", updatedAt: now })
      .where(eq(lostFoundClaims.id, item.approvedClaimId));

    const updatedItems = await db
      .update(lostFoundItems)
      .set({
        status: "returned",
        returnedToId: approvedClaim?.claimantId ?? null,
        returnedAt: now,
        handoverCodePlain: null,
        handoverCodeHash: null,
        updatedAt: now,
      })
      .where(eq(lostFoundItems.id, item.id))
      .returning();

    return {
      item: updatedItems[0],
      approvedClaim,
    };
  } catch (error) {
    throw wrapDbError("completeLostFoundHandover", error);
  }
}

export async function archiveLostFoundItem(itemId: unknown, actor: ViewerContext) {
  const numId = toNumericId(itemId);
  if (!numId) return { error: { status: 400, message: "Invalid item ID." } };
  try {
    const rows = await db
      .select()
      .from(lostFoundItems)
      .where(eq(lostFoundItems.id, numId))
      .limit(1);
    const item = rows[0];
    if (!item) return { error: { status: 404, message: "Found item not found." } };
    if (item.finderId !== actor.id && actor.role !== "admin") {
      return {
        error: { status: 403, message: "Only the finder or an admin can archive this post." },
      };
    }
    await db
      .update(lostFoundItems)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(lostFoundItems.id, numId));
    return { success: true, item };
  } catch (error) {
    throw wrapDbError("archiveLostFoundItem", error);
  }
}

export async function getLostFoundSummary(viewer: ViewerContext) {
  try {
    const [itemStats, fraudStrikes, pendingReviewCount] = await Promise.all([
      db
        .select({
          totalActive: sql<number>`count(*) filter (where ${lostFoundItems.status} in ('open', 'claim_pending', 'approved'))::int`,
          openCount: sql<number>`count(*) filter (where ${lostFoundItems.status} = 'open')::int`,
          pendingClaimsItems: sql<number>`count(*) filter (where ${lostFoundItems.status} = 'claim_pending')::int`,
          returnedCount: sql<number>`count(*) filter (where ${lostFoundItems.status} = 'returned')::int`,
        })
        .from(lostFoundItems),
      getUserFraudStrikeCount(viewer.id),
      db
        .select({ value: count() })
        .from(lostFoundClaims)
        .where(eq(lostFoundClaims.status, "pending")),
    ]);

    const flaggedTotal =
      viewer.role === "admin"
        ? Number(
            (
              await db
                .select({ value: count() })
                .from(lostFoundClaims)
                .where(eq(lostFoundClaims.isFlaggedFraud, true))
            )[0]?.value || 0
          )
        : 0;

    const row = itemStats[0];
    return {
      totalActive: Number(row?.totalActive || 0),
      openCount: Number(row?.openCount || 0),
      pendingClaimsItems: Number(row?.pendingClaimsItems || 0),
      returnedCount: Number(row?.returnedCount || 0),
      pendingClaimsTotal: Number(pendingReviewCount[0]?.value || 0),
      myFraudStrikes: fraudStrikes,
      flaggedFraudTotal: flaggedTotal,
    };
  } catch (error) {
    throw wrapDbError("getLostFoundSummary", error);
  }
}
