import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MessageCircle, Send, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import messageService from '../services/messageService';
import listingService from '../services/listingService';
import userService from '../services/userService';
import dealRequestService from '../services/dealRequestService';

const formatMessageTime = (value) =>
    new Date(value).toLocaleString('tr-TR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });

const Messages = () => {
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const listingId = Number(searchParams.get('listingId'));
    const sellerId = Number(searchParams.get('sellerId'));
    const canLoadConversation = Number.isInteger(listingId) && listingId > 0 && Number.isInteger(sellerId) && sellerId > 0;

    const [threads, setThreads] = useState([]);
    const [messages, setMessages] = useState([]);
    const [content, setContent] = useState('');
    const [isLoadingThreads, setIsLoadingThreads] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState(null);
    const [conversationMeta, setConversationMeta] = useState(null);
    const [isUpdatingDealRequest, setIsUpdatingDealRequest] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            setIsLoadingThreads(false);
            return;
        }

        const loadThreads = async () => {
            try {
                const data = await messageService.getThreads();
                setThreads(data);
            } catch (err) {
                setError(err.response?.data?.error || 'Mesaj kutusu yüklenemedi.');
            } finally {
                setIsLoadingThreads(false);
            }
        };

        loadThreads();
    }, [isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated || canLoadConversation || isLoadingThreads || threads.length === 0) {
            return;
        }

        const firstThread = threads[0];
        navigate(`/messages?listingId=${firstThread.listingId}&sellerId=${firstThread.otherUserId}`, { replace: true });
    }, [canLoadConversation, isAuthenticated, isLoadingThreads, navigate, threads]);

    useEffect(() => {
        if (!isAuthenticated || !canLoadConversation) {
            setMessages([]);
            setIsLoadingMessages(false);
            return;
        }

        const loadConversation = async () => {
            setIsLoadingMessages(true);

            try {
                const data = await messageService.getConversation(sellerId, listingId);
                setMessages(data);

                const unreadIncoming = data.filter(
                    (message) => Number(message.receiverId) === Number(user?.id) && !message.isRead
                );

                if (unreadIncoming.length > 0) {
                    await Promise.all(unreadIncoming.map((message) => messageService.markAsRead(message.id)));

                    setMessages((prev) =>
                        prev.map((message) =>
                            unreadIncoming.some((unread) => unread.id === message.id)
                                ? { ...message, isRead: true }
                                : message
                        )
                    );

                    setThreads((prev) =>
                        prev.map((thread) =>
                            Number(thread.listingId) === listingId && Number(thread.otherUserId) === sellerId
                                ? { ...thread, unreadCount: 0 }
                                : thread
                        )
                    );
                }
            } catch (err) {
                setError(err.response?.data?.error || 'Mesajlar yüklenemedi.');
            } finally {
                setIsLoadingMessages(false);
            }
        };

        loadConversation();
    }, [canLoadConversation, isAuthenticated, listingId, sellerId, user?.id]);

    const selectedThread = useMemo(
        () => threads.find((thread) => Number(thread.listingId) === listingId && Number(thread.otherUserId) === sellerId) || null,
        [listingId, sellerId, threads]
    );

    useEffect(() => {
        if (!isAuthenticated || !canLoadConversation || selectedThread) {
            setConversationMeta(null);
            return;
        }

        const loadConversationMeta = async () => {
            try {
                const [listingResult, profileResult] = await Promise.all([
                    listingService.getListingById(listingId),
                    userService.getPublicProfile(sellerId),
                ]);

                setConversationMeta({
                    listingTitle: listingResult?.title || 'İlan',
                    listingImageUrl: listingResult?.imageUrl || null,
                    otherUserName: profileResult?.fullName || 'PAÜ Market Kullanıcısı',
                });
            } catch {
                setConversationMeta({
                    listingTitle: 'İlan',
                    listingImageUrl: null,
                    otherUserName: 'PAÜ Market Kullanıcısı',
                });
            }
        };

        loadConversationMeta();
    }, [canLoadConversation, isAuthenticated, listingId, selectedThread, sellerId]);

    const activeConversation = selectedThread || (canLoadConversation ? {
        otherUserId: sellerId,
        otherUserName: conversationMeta?.otherUserName || 'PAÜ Market Kullanıcısı',
        listingId,
        listingTitle: conversationMeta?.listingTitle || 'İlan',
        listingImageUrl: conversationMeta?.listingImageUrl || null,
    } : null);

    const conversationTitle = activeConversation
        ? activeConversation.otherUserName
        : canLoadConversation
            ? 'Konuşma'
            : 'Mesajlar';

    const handleOpenThread = (thread) => {
        setError(null);
        navigate(`/messages?listingId=${thread.listingId}&sellerId=${thread.otherUserId}`);
    };

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
            setThreads((prev) => {
                const existing = prev.find((thread) => Number(thread.listingId) === listingId && Number(thread.otherUserId) === sellerId);
                const threadBase = existing || {
                    otherUserId: sellerId,
                    otherUserName: activeConversation?.otherUserName || 'PAÜ Market Kullanıcısı',
                    listingId,
                    listingTitle: activeConversation?.listingTitle || 'İlan',
                    listingImageUrl: activeConversation?.listingImageUrl || null,
                };

                const updated = {
                    ...threadBase,
                    lastMessage: sentMessage.content,
                    lastMessageAt: sentMessage.sentAt,
                    isLastMessageMine: true,
                    unreadCount: 0,
                };

                return [updated, ...prev.filter((thread) => !(Number(thread.listingId) === listingId && Number(thread.otherUserId) === sellerId))];
            });
            setContent('');
        } catch (err) {
            setError(err.response?.data?.error || 'Mesaj gönderilemedi.');
        } finally {
            setIsSending(false);
        }
    };

    const updateThreadDealStatus = (requestId, statusName) => {
        const statusValue = statusName === 'Accepted' ? 2 : 3;

        setThreads((prev) =>
            prev.map((thread) =>
                Number(thread.dealRequestId) === Number(requestId)
                    ? {
                        ...thread,
                        dealRequestStatus: statusValue,
                        dealRequestStatusName: statusName,
                        canRespondToDealRequest: false,
                    }
                    : thread
            )
        );
    };

    const handleDealRequestAction = async (action) => {
        if (!activeConversation?.dealRequestId) return;

        setIsUpdatingDealRequest(true);
        setError(null);

        try {
            if (action === 'accept') {
                await dealRequestService.acceptDealRequest(activeConversation.dealRequestId);
                updateThreadDealStatus(activeConversation.dealRequestId, 'Accepted');
            } else {
                await dealRequestService.rejectDealRequest(activeConversation.dealRequestId);
                updateThreadDealStatus(activeConversation.dealRequestId, 'Rejected');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Anlaşma isteği güncellenemedi.');
        } finally {
            setIsUpdatingDealRequest(false);
        }
    };

    const dealStatusTone = {
        Pending: 'bg-amber-50 text-amber-700 border-amber-200',
        Accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
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

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-6">
                <aside className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100">
                        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Mesajlar</h1>
                        <p className="text-sm text-gray-500 mt-1">İlanlar üzerinden başlattığın tüm görüşmeler burada listelenir.</p>
                    </div>

                    <div className="max-h-[42rem] overflow-y-auto">
                        {isLoadingThreads ? (
                            <div className="px-6 py-12 text-center text-gray-500">Mesaj kutusu yükleniyor...</div>
                        ) : threads.length === 0 ? (
                            <div className="px-6 py-12 text-center">
                                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
                                    <MessageCircle className="w-7 h-7" />
                                </div>
                                <p className="text-gray-700 font-semibold mb-2">Henüz konuşman yok</p>
                                <p className="text-sm text-gray-500">Bir ilan detayındaki mesaj butonundan ilk görüşmeni başlatabilirsin.</p>
                            </div>
                        ) : (
                            threads.map((thread) => {
                                const isSelected = Number(thread.listingId) === listingId && Number(thread.otherUserId) === sellerId;

                                return (
                                    <button
                                        key={`${thread.listingId}-${thread.otherUserId}`}
                                        type="button"
                                        onClick={() => handleOpenThread(thread)}
                                        className={`w-full text-left px-5 py-4 border-b border-gray-100 transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 shrink-0">
                                                {thread.listingImageUrl ? (
                                                    <img src={thread.listingImageUrl} alt={thread.listingTitle} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">PAU</div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                                                    <p className="text-sm font-bold text-gray-900 truncate">{thread.otherUserName}</p>
                                                    <span className="text-[11px] text-gray-400 whitespace-nowrap">{formatMessageTime(thread.lastMessageAt)}</span>
                                                </div>
                                                <p className="text-xs font-semibold text-blue-600 truncate mt-0.5">{thread.listingTitle}</p>
                                                {thread.dealRequestStatusName && (
                                                    <span className={`inline-flex mt-2 px-2.5 py-1 rounded-full text-[11px] font-bold border ${dealStatusTone[thread.dealRequestStatusName] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                                        {thread.dealRequestStatusName === 'Pending' ? 'Anlaşma bekliyor' : thread.dealRequestStatusName === 'Accepted' ? 'Anlaşma kabul edildi' : 'Anlaşma reddedildi'}
                                                    </span>
                                                )}
                                                <p className="text-sm text-gray-600 truncate mt-1">
                                                    {thread.isLastMessageMine ? 'Sen: ' : ''}
                                                    {thread.lastMessage}
                                                </p>
                                                {thread.unreadCount > 0 && (
                                                    <span className="inline-flex mt-2 px-2.5 py-1 rounded-full bg-blue-600 text-white text-[11px] font-bold">
                                                        {thread.unreadCount} yeni
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </aside>

                <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[42rem] flex flex-col">
                    <div className="px-6 py-5 border-b border-gray-100">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div>
                                <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">{conversationTitle}</h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    {activeConversation
                                        ? `${activeConversation.listingTitle} ilanı hakkında konuşuyorsun.`
                                        : 'Sol taraftan bir konuşma seç ya da ilan detayından yeni mesaj başlat.'}
                                </p>
                                {activeConversation?.dealRequestStatusName && (
                                    <div className="flex flex-wrap items-center gap-2 mt-3">
                                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${dealStatusTone[activeConversation.dealRequestStatusName] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                            {activeConversation.dealRequestStatusName === 'Pending' ? 'Anlaşma isteği beklemede' : activeConversation.dealRequestStatusName === 'Accepted' ? 'Anlaşma kabul edildi' : 'Anlaşma reddedildi'}
                                        </span>
                                        {activeConversation.dealRequestNote && (
                                            <span className="text-xs text-gray-500">Not: {activeConversation.dealRequestNote}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                            {activeConversation && (
                                <div className="flex flex-wrap items-center gap-3">
                                    {activeConversation.canRespondToDealRequest && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => handleDealRequestAction('reject')}
                                                disabled={isUpdatingDealRequest}
                                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors font-semibold text-sm disabled:opacity-60"
                                            >
                                                Reddet
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDealRequestAction('accept')}
                                                disabled={isUpdatingDealRequest}
                                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors font-semibold text-sm disabled:opacity-60"
                                            >
                                                {isUpdatingDealRequest ? 'Güncelleniyor...' : 'Anlaşmayı Kabul Et'}
                                            </button>
                                        </>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/profile/${activeConversation.otherUserId}`)}
                                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors font-semibold text-sm"
                                    >
                                        <User className="w-4 h-4" />
                                        Profili Gör
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {!canLoadConversation ? (
                        <div className="flex-1 flex items-center justify-center px-6">
                            <div className="text-center max-w-xl">
                                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-5">
                                    <MessageCircle className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl font-extrabold text-gray-900 mb-3">Bir konuşma seç</h3>
                                <p className="text-gray-600">Mesaj kutundaki bir görüşmeyi açabilir veya bir ilan detayından yeni satıcı konuşması başlatabilirsin.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 p-6 space-y-4 overflow-y-auto bg-gray-50">
                                {isLoadingMessages ? (
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
                        </>
                    )}
                </section>
            </div>
        </div>
    );
};

export default Messages;
