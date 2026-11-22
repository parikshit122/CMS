const {
  getNotificationsForUser,
  countNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotificationForUser,
  deleteAllNotificationsForUser,
} = require("../../src/db/notifications.ts");

const getNotifications = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);

    const { notifications, total, unreadCount } = await getNotificationsForUser(
      req.user.id,
      page,
      limit
    );

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await countNotifications({
      recipientId: req.user.id,
      isRead: false,
    });
    res.json({ success: true, unreadCount: count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await markNotificationRead(id, req.user.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    res.json({ success: true, data: notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await markAllNotificationsRead(req.user.id);
    res.json({ success: true, message: "All notifications marked as read." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await deleteNotificationForUser(id, req.user.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    res.json({ success: true, message: "Notification deleted." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteAllNotifications = async (req, res) => {
  try {
    await deleteAllNotificationsForUser(req.user.id);
    res.json({ success: true, message: "All notifications cleared." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
};