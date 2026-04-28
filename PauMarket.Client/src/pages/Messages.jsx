import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Send, User, Wifi, WifiOff } from 'lucide-react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
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

const dealStatusTone = {
    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
    Accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
    Withdrawn: 'bg-slate-50 text-slate-700 border-slate-200',
    Cancelled: 'bg-gray-50 text-gray-700 border-gray-200',
};

const dealStatusLabels = {
    Pending: 'Anlaşma bekliyor',
    Accepted: 'Anlaşma kabul edildi',
    Rejected: 'Anlaşma reddedildi',
    Withdrawn: 'İstek geri çekildi',
    Cancelled: 'Anlaşma iptal edildi',
};

const dealStatusCodes = {
    Pending: 1,
    Accepted: 2,
    Rejected: 3,
    Withdrawn: 4,
    Cancelled: 5,
};

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
    const [hubConnection, setHubConnection] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('Bağlanıyor');
    const messagesEndRef = useRef(null);

    // ── SignalR Bağlantısı Kurulumu ──
    useEffect(() => {
        if (!isAuthenticated) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        const hubBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5251/api').replace(/\/api\/?$/, '');
        const connection = new HubConnectionBuilder()
            .withUrl(`${hubBaseUrl}/chathub`, {
                accessTokenFactory: () => token
            })
            .configureLogging(LogLevel.Information)
            .withAutomaticReconnect()
            .build();

        connection.onreconnecting(() => setConnectionStatus('Bağlanıyor'));
        connection.onreconnected(() => setConnectionStatus('Canlı'));
        connection.onclose(() => setConnectionStatus('Çevrimdışı'));

        connection.start()
            .then(() => {
                console.log('SignalR Connected');
                setHubConnection(connection);
                setConnectionStatus('Canlı');
            })
            .catch(err => {
                console.error('SignalR Connection Error: ', err);
                setConnectionStatus('Çevrimdışı');
            });

        return () => {
            if (connection) {
                connection.stop();
            }
        };
    }, [isAuthenticated]);

    // ── Gelen Mesajı Dinleme ──
    useEffect(() => {
        if (!hubConnection) return;

        const handleReceiveMessage = (incomingMessage) => {
            // Eğer mesaj şu an açık olan konuşmaya aitse ekrana ekle
            if (Number(incomingMessage.listingId) === listingId && Number(incomingMessage.senderId) === sellerId) {
                setMessages(prev => [...prev, incomingMessage]);
                // Açık konuşmadaki mesajı hemen okundu olarak işaretleyebiliriz
                messageService.markAsRead(incomingMessage.id).catch(console.error);
            }

            // Sol taraftaki Threads (Görüşmeler) listesini güncelle
            setThreads(prevThreads => {
                const existingIndex = prevThreads.findIndex(t => 
                    Number(t.listingId) === Number(incomingMessage.listingId) && 
                    Number(t.otherUserId) === Number(incomingMessage.senderId)
                );

                if (existingIndex > -1) {
                    const updatedThread = {
                        ...prevThreads[existingIndex],
                        lastMessage: incomingMessage.content,
                        lastMessageAt: incomingMessage.sentAt,
                        isLastMessageMine: false,
                        unreadCount: (Number(incomingMessage.listingId) === listingId && Number(incomingMessage.senderId) === sellerId) 
                            ? 0 
                            : prevThreads[existingIndex].unreadCount + 1
                    };
                    const newThreads = [...prevThreads];
                    newThreads.splice(existingIndex, 1);
                    return [updatedThread, ...newThreads];
                } else {
                    // Yeni birinden ilk defa mesaj gelirse listeyi yenile (basit tutmak için API'den tekrar çektirebiliriz)
                    messageService.getThreads().then(data => setThreads(data));
                    return prevThreads;
                }
            });
        };

        hubConnection.on('ReceiveMessage', handleReceiveMessage);

        return () => {
            hubConnection.off('ReceiveMessage', handleReceiveMessage);
        };
    }, [hubConnection, listingId, sellerId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages, isLoadingMessages]);

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
        canRespondToDealRequest: false,
        canWithdrawDealRequest: false,
        canCancelDealRequest: false,
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

    const handleComposerKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
        }
    };

    const updateThreadDealStatus = (requestId, statusName) => {
        const statusValue = dealStatusCodes[statusName] ?? null;
        const canCancelDealRequest = statusName === 'Accepted';

        setThreads((prev) =>
            prev.map((thread) =>
                Number(thread.dealRequestId) === Number(requestId)
                    ? {
                        ...thread,
                        dealRequestStatus: statusValue,
                        dealRequestStatusName: statusName,
                        canRespondToDealRequest: false,
                        canWithdrawDealRequest: false,
                        canCancelDealRequest,
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
            } else if (action === 'reject') {
                await dealRequestService.rejectDealRequest(activeConversation.dealRequestId);
                updateThreadDealStatus(activeConversation.dealRequestId, 'Rejected');
            } else if (action === 'withdraw') {
                await dealRequestService.withdrawDealRequest(activeConversation.dealRequestId);
                updateThreadDealStatus(activeConversation.dealRequestId, 'Withdrawn');
            } else {
                await dealRequestService.cancelDealRequest(activeConversation.dealRequestId);
                updateThreadDealStatus(activeConversation.dealRequestId, 'Cancelled');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Anlaşma isteği güncellenemedi.');
        } finally {
            setIsUpdatingDealRequest(false);
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
                                                        {dealStatusLabels[thread.dealRequestStatusName] || 'Durum güncellendi'}
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
                                {canLoadConversation && (
                                    <button
                                        type="button"
                                        onClick={() => navigate('/messages')}
                                        className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 lg:hidden"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Mesajlara dön
                                    </button>
                                )}
                                <div className="flex flex-wrap items-center gap-3">
                                    <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">{conversationTitle}</h2>
                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black ${
                                        connectionStatus === 'Canlı'
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        {connectionStatus === 'Canlı' ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                                        {connectionStatus}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                    {activeConversation
                                        ? `${activeConversation.listingTitle} ilanı hakkında konuşuyorsun.`
                                        : 'Sol taraftan bir konuşma seç ya da ilan detayından yeni mesaj başlat.'}
                                </p>
                                {activeConversation && (
                                    <Link
                                        to={`/listings/${activeConversation.listingId}`}
                                        className="mt-2 inline-flex text-xs font-bold text-blue-600 hover:text-blue-800"
                                    >
                                        İlan detayına git
                                    </Link>
                                )}
                                {activeConversation?.dealRequestStatusName && (
                                    <div className="flex flex-wrap items-center gap-2 mt-3">
                                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${dealStatusTone[activeConversation.dealRequestStatusName] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                            {dealStatusLabels[activeConversation.dealRequestStatusName] || 'Durum güncellendi'}
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
                                    {activeConversation?.canWithdrawDealRequest && (
                                        <button
                                            type="button"
                                            onClick={() => handleDealRequestAction('withdraw')}
                                            disabled={isUpdatingDealRequest}
                                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors font-semibold text-sm disabled:opacity-60"
                                        >
                                            {isUpdatingDealRequest ? 'Güncelleniyor...' : 'İsteği Geri Çek'}
                                        </button>
                                    )}
                                    {activeConversation?.canCancelDealRequest && (
                                        <button
                                            type="button"
                                            onClick={() => handleDealRequestAction('cancel')}
                                            disabled={isUpdatingDealRequest}
                                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-orange-200 text-orange-700 hover:bg-orange-50 transition-colors font-semibold text-sm disabled:opacity-60"
                                        >
                                            {isUpdatingDealRequest ? 'Güncelleniyor...' : 'Anlaşmayı İptal Et'}
                                        </button>
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
                                <div ref={messagesEndRef} />
                            </div>

                            <form onSubmit={handleSend} className="border-t border-gray-100 p-4 sm:p-5 bg-white">
                                {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <textarea
                                        value={content}
                                        onChange={(event) => setContent(event.target.value)}
                                        onKeyDown={handleComposerKeyDown}
                                        rows={3}
                                        placeholder="Mesajını yaz... Enter ile gönder, Shift+Enter yeni satır"
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
