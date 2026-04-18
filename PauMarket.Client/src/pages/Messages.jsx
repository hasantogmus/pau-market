import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MessageCircle, Send } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import messageService from '../services/messageService';

const formatMessageTime = (value) =>
    new Date(value).toLocaleString('tr-TR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });

const Messages = () => {
    const { isAuthenticated, user } = useAuth();
    const [searchParams] = useSearchParams();
    const listingId = Number(searchParams.get('listingId'));
    const sellerId = Number(searchParams.get('sellerId'));

    const [messages, setMessages] = useState([]);
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState(null);

    const canLoadConversation = Number.isInteger(listingId) && listingId > 0 && Number.isInteger(sellerId) && sellerId > 0;

    const conversationTitle = useMemo(() => {
        if (!canLoadConversation) return 'Mesajlaşma';
        return `İlan #${listingId} için görüşme`;
    }, [canLoadConversation, listingId]);

    useEffect(() => {
        if (!isAuthenticated || !canLoadConversation) {
            setIsLoading(false);
            return;
        }

        const load = async () => {
            try {
                const data = await messageService.getConversation(sellerId, listingId);
                setMessages(data);
            } catch (err) {
                setError(err.response?.data?.error || 'Mesajlar yüklenemedi.');
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, [canLoadConversation, isAuthenticated, listingId, sellerId]);

    const handleSend = async (event) => {
        event.preventDefault();
        if (!content.trim() || !canLoadConversation) return;

        setIsSending(true);
        setError(null);

        try {
            const sentMessage = await messageService.sendMessage({
                receiverId: sellerId,
                listingId,
                content: content.trim(),
            });

            setMessages((prev) => [...prev, sentMessage]);
            setContent('');
        } catch (err) {
            setError(err.response?.data?.error || 'Mesaj gönderilemedi.');
        } finally {
            setIsSending(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center px-4">
                <div className="text-center max-w-lg bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
                    <h1 className="text-2xl font-extrabold text-gray-900 mb-3">Mesajlar için giriş yap</h1>
                    <p className="text-gray-600 mb-6">Satıcılarla güvenli şekilde iletişim kurmak için hesabınla giriş yapman gerekiyor.</p>
                    <Link to="/login" className="inline-flex items-center justify-center px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-colors">
                        Giriş Yap
                    </Link>
                </div>
            </div>
        );
    }

    if (!canLoadConversation) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center px-4">
                <div className="text-center max-w-xl bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-5">
                        <MessageCircle className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-gray-900 mb-3">Görüşme seçilmedi</h1>
                    <p className="text-gray-600 mb-6">Mesaj ekranını bir ilan detayından açtığında doğru alıcı ve ilan bilgileri otomatik gelir.</p>
                    <Link to="/" className="inline-flex items-center justify-center px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-colors">
                        Ana Sayfaya Dön
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100">
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">{conversationTitle}</h1>
                    <p className="text-sm text-gray-500 mt-1">Karşı kullanıcı: #{sellerId}</p>
                </div>

                <div className="p-6 space-y-4 min-h-[24rem] max-h-[32rem] overflow-y-auto bg-gray-50">
                    {isLoading ? (
                        <div className="text-center text-gray-500 py-20">Konuşma yükleniyor...</div>
                    ) : messages.length === 0 ? (
                        <div className="text-center text-gray-500 py-20">Henüz mesaj yok. İlk mesajı sen gönder.</div>
                    ) : (
                        messages.map((message) => {
                            const mine = Number(message.senderId) === Number(user?.id);

                            return (
                                <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${mine ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 border border-gray-100'}`}>
                                        <p className="text-sm leading-relaxed whitespace-pre-line">{message.content}</p>
                                        <p className={`text-[11px] mt-2 font-medium ${mine ? 'text-blue-100' : 'text-gray-400'}`}>
                                            {formatMessageTime(message.sentAt)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <form onSubmit={handleSend} className="border-t border-gray-100 p-4 sm:p-5 bg-white">
                    {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <textarea
                            value={content}
                            onChange={(event) => setContent(event.target.value)}
                            rows={3}
                            placeholder="Mesajını yaz..."
                            className="flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                        />
                        <button
                            type="submit"
                            disabled={isSending || !content.trim()}
                            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-2xl transition-colors"
                        >
                            <Send className="w-4 h-4" />
                            {isSending ? 'Gönderiliyor...' : 'Gönder'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Messages;
