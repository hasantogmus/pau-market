import React from 'react';
import { Link } from 'react-router-dom';
import { Construction, ArrowLeft } from 'lucide-react';

const PlaceholderPage = ({
    title,
    description,
    primaryLabel = 'Ana Sayfaya Dön',
    primaryTo = '/',
}) => {
    return (
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
            <div className="max-w-xl w-full text-center bg-white border border-gray-100 rounded-3xl shadow-sm p-8 sm:p-10">
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Construction className="w-8 h-8" />
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-3">
                    {title}
                </h1>

                <p className="text-gray-600 leading-relaxed mb-8">
                    {description}
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link
                        to={primaryTo}
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-colors w-full sm:w-auto"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {primaryLabel}
                    </Link>

                    <Link
                        to="/"
                        className="inline-flex items-center justify-center px-5 py-3 text-gray-700 font-semibold rounded-2xl border border-gray-200 hover:bg-gray-50 transition-colors w-full sm:w-auto"
                    >
                        Vitrine Git
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default PlaceholderPage;
