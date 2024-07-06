import React, { useEffect } from 'react';
import { useLanguage } from '../../hooks'

import * as text from './contact.json'

const MAPS_API_KEY = "AIzaSyAd2AEAW67Pgpd27MHpl6caPcXrb911K30"

const ContactUs = () => {
    const { lang } = useLanguage() || { lang: 'fa' }

    const { title, address } = text[lang]

    useEffect(() => {
        // Initialize and add the map
        const initMap = () => {
            const clinicLocation = { lat: 35.802433, lng: 51.418589 }
            const map = new window.google.maps.Map(document.getElementById('map'), {
                zoom: 16,
                center: clinicLocation,
            });
            new window.google.maps.Marker({
                position: clinicLocation,
                map: map,
            });
        };

        // Load the Google Maps script
        const loadScript = (url) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            script.defer = true;
            script.onload = () => initMap();
            document.head.appendChild(script);
        };

        // Replace 'YOUR_API_KEY' with your actual Google Maps API key
        loadScript(`https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&callback=initMap`);
    }, []);

    const tels = address.tel || []

    return (
        <section className="py-10 bg-gray-50 overflow-hidden">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold mb-6 text-center">{title}</h2>
                <div id="map" className="rounded-lg shadow-lg mb-6" style={{ height: '400px', width: '100%' }}></div>
                <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                   {/* Location Icon */}
                    <svg className="h-8 w-8 text-blue-500 self-center w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>

                    <h3 className="text-xl font-semibold mb-4">{address.title}</h3>
                    <p className="mb-2">{address.adr}</p>
                    <p className="mb-2">
                        <a href={`tel:${tels?.[0]}`} className="text-blue-600">{tels?.[0]}</a> -
                        <a href={`tel:${tels?.[1]}`} className="text-blue-600">{tels?.[1]}</a> -
                        <a href={`tel:${tels?.[2]}`} className="text-blue-600">{tels?.[2]}</a> -
                    </p>
                    <p className="mb-2">{address.hours}</p>
                </div>
            </div>
        </section>
    );
};

export default ContactUs;
