import React from "react";

import s1 from "../../assets/images/carousel/carousel1.png";
import s2 from "../../assets/images/carousel/carousel2.png";


const slides = [
    {
        id: 0,
        src: s2,
        alt: "Slide 1",
        caption: {
            title: "Welcome to Our Website",
            description: "Discover amazing products and services.",
        },
    },
    {
        id: 1,
        src: s2,
        alt: "Slide 2",
        caption: {
            title: "Quality You Can Trust",
            description: "We deliver excellence in everything we do.",
        },
    },
];

const Carousel = () => {
    return (
        <div
            id="carouselExampleDark"
            className="carousel slide carousel-dark h-100"
            data-bs-ride="carousel"
        >

            <div className="carousel-indicators">
                {slides.map((slide, index) => (
                    <button
                        key={slide.id}
                        type="button"
                        data-bs-target="#carouselExampleDark"
                        data-bs-slide-to={index}
                        className={index === 0 ? "active" : ""}
                        aria-current={index === 0 ? "true" : undefined}
                        aria-label={slide.alt}
                    />
                ))}
            </div>

            <div className="carousel-inner h-100">
                {slides.map((slide, index) => (
                    <div
                        key={slide.id}
                        className={`carousel-item h-100 ${index === 0 ? "active" : ""
                            }`}
                        data-bs-interval="5000"
                    >
                        {/* Slide Image */}
                        <img
                            src={slide.src}
                            className="d-block w-100 h-100"
                            alt={slide.alt}
                            style={{
                                objectFit: "cover",
                                objectPosition: "center",
                            }}
                        />

                        {/* Slide Caption */}
                        <div className="carousel-caption d-none d-md-block">
                            <h2 className="fw-bold text-white">
                                {slide.caption.title}
                            </h2>
                            <p className="fs-5 text-white">
                                {slide.caption.description}
                            </p>
                            <button className="btn btn-primary btn-lg mt-2">
                                Learn More
                            </button>
                        </div>

                    </div>
                ))}
            </div>

            <button
                className="carousel-control-prev"
                type="button"
                data-bs-target="#carouselExampleDark"
                data-bs-slide="prev"
            >
                <span
                    className="carousel-control-prev-icon"
                    aria-hidden="true"
                />
                <span className="visually-hidden">Previous</span>
            </button>

            <button
                className="carousel-control-next"
                type="button"
                data-bs-target="#carouselExampleDark"
                data-bs-slide="next"
            >
                <span
                    className="carousel-control-next-icon"
                    aria-hidden="true"
                />
                <span className="visually-hidden">Next</span>
            </button>

        </div>
    );
};

export default Carousel;