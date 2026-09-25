const DATABASE_URL =
    process.env.FIREBASE_DATABASE_URL ||
    "https://appnetic1000-default-rtdb.firebaseio.com";

const OTP_UID = "UJ1G3C70YMT59RUGB";

const NOTIFICATION_URL =
    "https://chat-notification-server.onrender.com/send";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function safeString(value) {
    return typeof value === "string" ? value.trim() : "";
}

function json(res, status, data) {
    return res.status(status).json(data);
}

function generatePushKey() {
    const chars =
        "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";

    let key = "";

    for (let i = 0; i < 20; i++) {
        key += chars[Math.floor(Math.random() * chars.length)];
    }

    return key;
}

function getUsername(user) {
    return safeString(
        user?.Username ||
        user?.username ||
        user?.userName ||
        user?.name
    );
}

function getAvatar(user) {
    return safeString(
        user?.avatar ||
        user?.Avatar ||
        user?.logo ||
        user?.profilePicture ||
        user?.profilePic ||
        ""
    );
}

function getFcmToken(user) {
    return safeString(
        user?.fcmToken ||
        user?.FCMToken ||
        user?.fcm_token ||
        ""
    );
}

/*
|--------------------------------------------------------------------------
| Firebase REST
|--------------------------------------------------------------------------
*/

async function firebaseGet(path) {
    const url =
        DATABASE_URL.replace(/\/+$/, "") +
        "/" +
        path.replace(/^\/+/, "") +
        ".json";

    const response = await fetch(url);

    const text = await response.text();

    if (!response.ok) {
        throw new Error(
            `Firebase GET failed: HTTP ${response.status} ${text}`
        );
    }

    if (!text || text === "null") {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch {
        throw new Error("Firebase returned invalid JSON.");
    }
}

async function firebasePut(path, data) {
    const url =
        DATABASE_URL.replace(/\/+$/, "") +
        "/" +
        path.replace(/^\/+/, "") +
        ".json";

    const response = await fetch(url, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });

    const text = await response.text();

    if (!response.ok) {
        throw new Error(
            `Firebase PUT failed: HTTP ${response.status} ${text}`
        );
    }

    return text ? JSON.parse(text) : null;
}

async function firebasePatch(path, data) {
    const url =
        DATABASE_URL.replace(/\/+$/, "") +
        "/" +
        path.replace(/^\/+/, "") +
        ".json";

    const response = await fetch(url, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });

    const text = await response.text();

    if (!response.ok) {
        throw new Error(
            `Firebase PATCH failed: HTTP ${response.status} ${text}`
        );
    }

    return text ? JSON.parse(text) : null;
}

/*
|--------------------------------------------------------------------------
| Secret check
|--------------------------------------------------------------------------
*/

function isValidSecret(received, expected) {
    received = safeString(received);
    expected = safeString(expected);

    if (!received || !expected) {
        return false;
    }

    if (received.length !== expected.length) {
        return false;
    }

    let result = 0;

    for (let i = 0; i < received.length; i++) {
        result |= received.charCodeAt(i) ^ expected.charCodeAt(i);
    }

    return result === 0;
}

/*
|--------------------------------------------------------------------------
| Notification
|--------------------------------------------------------------------------
*/

async function sendChatNotification({
    receiverToken,
    senderUsername,
    message,
    senderAvatar,
    senderUid,
    receiverUid,
    messageKey
}) {
    if (!receiverToken) {
        return {
            sent: false,
            reason: "Receiver FCM token not found"
        };
    }

    const body = {
        token: receiverToken,

        title: senderUsername,
        body: message,

        username: senderUsername,

        subtext: senderUsername,

        image: senderAvatar,

        senderUid: senderUid,

        type: "chat",

        receiverUid: receiverUid,

        messageKey: messageKey
    };

    const response = await fetch(NOTIFICATION_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify(body)
    });

    const text = await response.text();

    if (!response.ok) {
        console.error(
            "Chat notification failed:",
            `HTTP ${response.status}`,
            text
        );

        return {
            sent: false,
            status: response.status
        };
    }

    return {
        sent: true
    };
}

/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
*/

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return json(res, 405, {
            success: false,
            error: "Method not allowed"
        });
    }

    try {

        /*
        |--------------------------------------------------------------------------
        | Secret
        |--------------------------------------------------------------------------
        */

        const expectedSecret =
            safeString(process.env.MESSAGE_API_SECRET);

        if (!expectedSecret) {
            console.error(
                "MESSAGE_API_SECRET is not configured."
            );

            return json(res, 500, {
                success: false,
                error: "Server configuration error"
            });
        }

        const receivedSecret =
            safeString(req.headers["x-message-api-secret"]);

        if (!isValidSecret(receivedSecret, expectedSecret)) {
            return json(res, 401, {
                success: false,
                error: "Unauthorized"
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Body
        |--------------------------------------------------------------------------
        */

        const body = req.body || {};

        const mode =
            safeString(body.mode) || "user";

        const toUid =
            safeString(body.toUid);

        const message =
            safeString(body.message);

        let fromUid =
            safeString(body.fromUid);

        /*
        |--------------------------------------------------------------------------
        | Validation
        |--------------------------------------------------------------------------
        */

        if (!toUid) {
            return json(res, 400, {
                success: false,
                error: "toUid is required"
            });
        }

        if (!message) {
            return json(res, 400, {
                success: false,
                error: "message is required"
            });
        }

        if (mode !== "user" && mode !== "otp") {
            return json(res, 400, {
                success: false,
                error: "Invalid mode"
            });
        }

        /*
        |--------------------------------------------------------------------------
        | OTP mode
        |--------------------------------------------------------------------------
        */

        if (mode === "otp") {
            fromUid = OTP_UID;
        }

        /*
        |--------------------------------------------------------------------------
        | User mode
        |--------------------------------------------------------------------------
        */

        if (mode === "user" && !fromUid) {
            return json(res, 400, {
                success: false,
                error: "fromUid is required"
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Prevent self-message
        |--------------------------------------------------------------------------
        */

        if (fromUid === toUid) {
            return json(res, 400, {
                success: false,
                error: "Sender and receiver cannot be the same"
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Get users
        |--------------------------------------------------------------------------
        */

        const senderUser = await firebaseGet(
            `Users/${encodeURIComponent(fromUid)}`
        );

        const receiverUser = await firebaseGet(
            `Users/${encodeURIComponent(toUid)}`
        );

        if (!senderUser) {
            return json(res, 404, {
                success: false,
                error: "Sender user not found"
            });
        }

        if (!receiverUser) {
            return json(res, 404, {
                success: false,
                error: "Receiver user not found"
            });
        }

        /*
        |--------------------------------------------------------------------------
        | User information
        |--------------------------------------------------------------------------
        */

        let senderUsername =
            getUsername(senderUser);

        const receiverUsername =
            getUsername(receiverUser);

        const senderAvatar =
            getAvatar(senderUser);

        const receiverAvatar =
            getAvatar(receiverUser);

        const receiverToken =
            getFcmToken(receiverUser);

        /*
        |--------------------------------------------------------------------------
        | OTP account fallback username
        |--------------------------------------------------------------------------
        */

        if (!senderUsername && mode === "otp") {
            senderUsername = "OTP Verification";
        }

        if (!senderUsername) {
            senderUsername = "User";
        }

        /*
        |--------------------------------------------------------------------------
        | Timestamp
        |--------------------------------------------------------------------------
        */

        const timestamp =
            String(Date.now());

        /*
        |--------------------------------------------------------------------------
        | Message key
        |--------------------------------------------------------------------------
        */

        const messageKey =
            generatePushKey();

        /*
        |--------------------------------------------------------------------------
        | Chat message - sender
        |--------------------------------------------------------------------------
        */

        const senderChat = {
            typ: "txt",
            txt: message,
            From: fromUid,
            to: toUid,
            usrnm: senderUsername,
            pp: senderAvatar,
            timestamp: timestamp,
            key: messageKey,
            stts: "Sent"
        };

        /*
        |--------------------------------------------------------------------------
        | Chat message - receiver
        |--------------------------------------------------------------------------
        */

        const receiverChat = {
            typ: "txt",
            txt: message,
            From: fromUid,
            to: toUid,
            usrnm: senderUsername,
            pp: senderAvatar,
            timestamp: timestamp,
            key: messageKey,
            stts: "Delivered"
        };

        /*
        |--------------------------------------------------------------------------
        | Sender inbox
        |--------------------------------------------------------------------------
        */

        const senderInbox = {
            lastMsg: message,
            msgType: "txt",
            lastMsgTime: Number(timestamp),
            from: fromUid,
            to: toUid,
            chatUserName: receiverUsername,
            chatUserPP: receiverAvatar,
            stts: "Sent"
        };

        /*
        |--------------------------------------------------------------------------
        | Receiver inbox
        |--------------------------------------------------------------------------
        */

        const receiverInboxPath =
            `InboxList/${toUid}/${fromUid}`;

        const existingReceiverInbox =
            await firebaseGet(receiverInboxPath);

        let unreadCount = 0;

        if (
            existingReceiverInbox &&
            typeof existingReceiverInbox.unreadCount === "number"
        ) {
            unreadCount =
                existingReceiverInbox.unreadCount;
        }

        unreadCount += 1;

        const receiverInbox = {
            lastMsg: message,
            msgType: "txt",
            lastMsgTime: Number(timestamp),
            from: fromUid,
            to: toUid,
            chatUserName: senderUsername,
            chatUserPP: senderAvatar,
            stts: "Delivered",
            unreadCount: unreadCount
        };

        /*
        |--------------------------------------------------------------------------
        | Firebase writes
        |--------------------------------------------------------------------------
        */

        await firebasePut(
            `chat/${fromUid}/${toUid}/${messageKey}`,
            senderChat
        );

        await firebasePut(
            `chat/${toUid}/${fromUid}/${messageKey}`,
            receiverChat
        );

        await firebasePatch(
            `InboxList/${fromUid}/${toUid}`,
            senderInbox
        );

        await firebasePatch(
            receiverInboxPath,
            receiverInbox
        );

        /*
        |--------------------------------------------------------------------------
        | Notification
        |--------------------------------------------------------------------------
        */

        const notification =
            await sendChatNotification({
                receiverToken: receiverToken,
                senderUsername: senderUsername,
                message: message,
                senderAvatar: senderAvatar,
                senderUid: fromUid,
                receiverUid: toUid,
                messageKey: messageKey
            });

        /*
        |--------------------------------------------------------------------------
        | Success
        |--------------------------------------------------------------------------
        */

        return json(res, 200, {
            success: true,

            message: "Message sent successfully",

            messageKey: messageKey,

            fromUid: fromUid,

            toUid: toUid,

            timestamp: Number(timestamp),

            mode: mode,

            notification: notification
        });

    } catch (error) {

        console.error(
            "send-message error:",
            error
        );

        return json(res, 500, {
            success: false,
            error: "Internal server error"
        });
    }
}
