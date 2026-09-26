import admin from "firebase-admin";


const USERS_DATABASE_URL =
    "https://appnetick-default-rtdb.firebaseio.com";

const DATABASE_URL =
    process.env.FIREBASE_DATABASE_URL ||
    "https://appnetic1000-default-rtdb.firebaseio.com";

const OTP_UID =
    "UJ1G3C70YMT59RUGB";

const NOTIFICATION_URL =
    "https://chat-notification-server.onrender.com/send";


/*
|--------------------------------------------------------------------------
| Firebase Admin Initialization
|--------------------------------------------------------------------------
|
| IMPORTANT:
| This database is the CHAT database.
|
*/

let firebaseApp;

try {

    firebaseApp =
        admin.app("appnetick-send-message");

} catch (error) {

    firebaseApp =
        admin.initializeApp(
            {
                credential:
                    admin.credential.cert(
                        {
                            projectId:
                                process.env.FIREBASE_PROJECT_ID,

                            clientEmail:
                                process.env.FIREBASE_CLIENT_EMAIL,

                            privateKey:
                                process.env.FIREBASE_PRIVATE_KEY
                                    .replace(/\\n/g, "\n")
                        }
                    ),

                databaseURL:
                    DATABASE_URL
            },

            "appnetick-send-message"
        );
}


/*
|--------------------------------------------------------------------------
| Firebase Database
|--------------------------------------------------------------------------
|
| This db is used ONLY for generating Firebase push keys.
|
*/

const db =
    admin.database(firebaseApp);


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function safeString(value) {

    return typeof value === "string"
        ? value.trim()
        : "";
}


function json(res, status, data) {

    return res
        .status(status)
        .json(data);
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
| Firebase REST GET
|--------------------------------------------------------------------------
*/

async function firebaseGet(
    databaseUrl,
    path
) {

    const url =
        databaseUrl.replace(/\/+$/, "") +
        "/" +
        path.replace(/^\/+/, "") +
        ".json";


    const response =
        await fetch(url);


    const text =
        await response.text();


    if (!response.ok) {

        throw new Error(
            `Firebase GET failed: HTTP ${response.status} ${text}`
        );
    }


    if (
        !text ||
        text === "null"
    ) {

        return null;
    }


    try {

        return JSON.parse(text);

    } catch {

        throw new Error(
            "Firebase returned invalid JSON."
        );
    }
}


/*
|--------------------------------------------------------------------------
| Firebase REST PUT
|--------------------------------------------------------------------------
*/

async function firebasePut(
    databaseUrl,
    path,
    data
) {

    const url =
        databaseUrl.replace(/\/+$/, "") +
        "/" +
        path.replace(/^\/+/, "") +
        ".json";


    const response =
        await fetch(
            url,
            {
                method: "PUT",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(data)
            }
        );


    const text =
        await response.text();


    if (!response.ok) {

        throw new Error(
            `Firebase PUT failed: HTTP ${response.status} ${text}`
        );
    }


    if (!text) {

        return null;
    }


    try {

        return JSON.parse(text);

    } catch {

        return null;
    }
}


/*
|--------------------------------------------------------------------------
| Firebase REST PATCH
|--------------------------------------------------------------------------
*/

async function firebasePatch(
    databaseUrl,
    path,
    data
) {

    const url =
        databaseUrl.replace(/\/+$/, "") +
        "/" +
        path.replace(/^\/+/, "") +
        ".json";


    const response =
        await fetch(
            url,
            {
                method: "PATCH",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(data)
            }
        );


    const text =
        await response.text();


    if (!response.ok) {

        throw new Error(
            `Firebase PATCH failed: HTTP ${response.status} ${text}`
        );
    }


    if (!text) {

        return null;
    }


    try {

        return JSON.parse(text);

    } catch {

        return null;
    }
}


/*
|--------------------------------------------------------------------------
| Secret Check
|--------------------------------------------------------------------------
*/

function isValidSecret(
    received,
    expected
) {

    received =
        safeString(received);

    expected =
        safeString(expected);


    if (
        !received ||
        !expected
    ) {

        return false;
    }


    if (
        received.length !==
        expected.length
    ) {

        return false;
    }


    let result = 0;


    for (
        let i = 0;
        i < received.length;
        i++
    ) {

        result |=
            received.charCodeAt(i) ^
            expected.charCodeAt(i);
    }


    return result === 0;
}


/*
|--------------------------------------------------------------------------
| Generate REAL Firebase Push Key
|--------------------------------------------------------------------------
|
| This is the important change.
|
| Android:
|
|     Chat1.push().getKey()
|
| Backend:
|
|     db.ref().push().key
|
| Both use Firebase's push-key algorithm.
|
*/

function generateFirebasePushKey() {

    const pushRef =
        db.ref().push();


    const key =
        pushRef.key;


    if (!key) {

        throw new Error(
            "Failed to generate Firebase push key."
        );
    }


    return key;
}


/*
|--------------------------------------------------------------------------
| Chat Notification
|--------------------------------------------------------------------------
*/

async function sendChatNotification({
    receiverToken,
    senderUsername,
    message,
    senderAvatar,
    senderUid,
    receiverUid,
    messageKey,
    mode
}) {

    if (!receiverToken) {

        return {
            sent: false,
            reason:
                "Receiver FCM token not found"
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Notification Type
    |--------------------------------------------------------------------------
    |
    | OTP:
    |     OtpChat
    |
    | Normal user message:
    |     chat
    |
    */

    const notificationType =
        mode === "otp"
            ? "OtpChat"
            : "chat";


    const body = {

        token:
            receiverToken,

        title:
            senderUsername,

        body:
            message,

        username:
            senderUsername,

        subtext:
            senderUsername,

        image:
            senderAvatar,

        senderUid:
            senderUid,

        type:
            notificationType,

        receiverUid:
            receiverUid,

        messageKey:
            messageKey
    };


    const response =
        await fetch(
            NOTIFICATION_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Accept":
                        "application/json"
                },

                body:
                    JSON.stringify(body)
            }
        );


    const text =
        await response.text();


    if (!response.ok) {

        console.error(
            "Chat notification failed:",
            `HTTP ${response.status}`,
            text
        );


        return {
            sent: false,
            status:
                response.status
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

export default async function handler(
    req,
    res
) {

    /*
    |--------------------------------------------------------------------------
    | Method
    |--------------------------------------------------------------------------
    */

    if (
        req.method !== "POST"
    ) {

        return json(
            res,
            405,
            {
                success: false,
                error:
                    "Method not allowed"
            }
        );
    }


    try {

        /*
        |--------------------------------------------------------------------------
        | Secret
        |--------------------------------------------------------------------------
        */

        const expectedSecret =
            safeString(
                process.env.MESSAGE_API_SECRET
            );


        if (!expectedSecret) {

            console.error(
                "MESSAGE_API_SECRET is not configured."
            );


            return json(
                res,
                500,
                {
                    success: false,
                    error:
                        "Server configuration error"
                }
            );
        }


        const receivedSecret =
            safeString(
                req.headers[
                    "x-message-api-secret"
                ]
            );


        if (
            !isValidSecret(
                receivedSecret,
                expectedSecret
            )
        ) {

            return json(
                res,
                401,
                {
                    success: false,
                    error:
                        "Unauthorized"
                }
            );
        }


        /*
        |--------------------------------------------------------------------------
        | Request Body
        |--------------------------------------------------------------------------
        */

        const body =
            req.body || {};


        const mode =
            safeString(
                body.mode
            ) || "user";


        const toUid =
            safeString(
                body.toUid
            );


        const message =
            safeString(
                body.message
            );


        let fromUid =
            safeString(
                body.fromUid
            );


        /*
        |--------------------------------------------------------------------------
        | Validation
        |--------------------------------------------------------------------------
        */

        if (!toUid) {

            return json(
                res,
                400,
                {
                    success: false,
                    error:
                        "toUid is required"
                }
            );
        }


        if (!message) {

            return json(
                res,
                400,
                {
                    success: false,
                    error:
                        "message is required"
                }
            );
        }


        if (
            mode !== "user" &&
            mode !== "otp"
        ) {

            return json(
                res,
                400,
                {
                    success: false,
                    error:
                        "Invalid mode"
                }
            );
        }


        /*
        |--------------------------------------------------------------------------
        | OTP Mode
        |--------------------------------------------------------------------------
        */

        if (
            mode === "otp"
        ) {

            fromUid =
                OTP_UID;
        }


        /*
        |--------------------------------------------------------------------------
        | User Mode
        |--------------------------------------------------------------------------
        */

        if (
            mode === "user" &&
            !fromUid
        ) {

            return json(
                res,
                400,
                {
                    success: false,
                    error:
                        "fromUid is required"
                }
            );
        }


        /*
        |--------------------------------------------------------------------------
        | Prevent Self Message
        |--------------------------------------------------------------------------
        */

        if (
            fromUid === toUid
        ) {

            return json(
                res,
                400,
                {
                    success: false,
                    error:
                        "Sender and receiver cannot be the same"
                }
            );
        }


        /*
        |--------------------------------------------------------------------------
        | GET USER DATA
        |--------------------------------------------------------------------------
        */

        const senderUser =
            await firebaseGet(
                USERS_DATABASE_URL,
                `Users/${encodeURIComponent(fromUid)}`
            );


        const receiverUser =
            await firebaseGet(
                USERS_DATABASE_URL,
                `Users/${encodeURIComponent(toUid)}`
            );


        /*
        |--------------------------------------------------------------------------
        | Check Sender
        |--------------------------------------------------------------------------
        */

        if (!senderUser) {

            console.error(
                "Sender user not found:",
                fromUid
            );


            return json(
                res,
                404,
                {
                    success: false,
                    error:
                        "Sender user not found",
                    uid:
                        fromUid
                }
            );
        }


        /*
        |--------------------------------------------------------------------------
        | Check Receiver
        |--------------------------------------------------------------------------
        */

        if (!receiverUser) {

            console.error(
                "Receiver user not found:",
                toUid
            );


            return json(
                res,
                404,
                {
                    success: false,
                    error:
                        "Receiver user not found",
                    uid:
                        toUid
                }
            );
        }


        /*
        |--------------------------------------------------------------------------
        | User Information
        |--------------------------------------------------------------------------
        */

        let senderUsername =
            getUsername(
                senderUser
            );


        const receiverUsername =
            getUsername(
                receiverUser
            );


        const senderAvatar =
            getAvatar(
                senderUser
            );


        const receiverAvatar =
            getAvatar(
                receiverUser
            );


        const receiverToken =
            getFcmToken(
                receiverUser
            );


        /*
        |--------------------------------------------------------------------------
        | OTP Username Fallback
        |--------------------------------------------------------------------------
        */

        if (
            !senderUsername &&
            mode === "otp"
        ) {

            senderUsername =
                "OTP Verification";
        }


        if (!senderUsername) {

            senderUsername =
                "User";
        }


        /*
        |--------------------------------------------------------------------------
        | Timestamp
        |--------------------------------------------------------------------------
        */

        const timestamp =
            String(
                Date.now()
            );


        /*
        |--------------------------------------------------------------------------
        | REAL FIREBASE PUSH KEY
        |--------------------------------------------------------------------------
        */

        const messageKey =
            generateFirebasePushKey();


        console.log(
            "Generated Firebase Push Key:",
            messageKey
        );


        /*
        |--------------------------------------------------------------------------
        | Sender Chat
        |--------------------------------------------------------------------------
        */

        const senderChat = {

            typ:
                "txt",

            txt:
                message,

            From:
                fromUid,

            to:
                toUid,

            usrnm:
                senderUsername,

            pp:
                senderAvatar,

            timestamp:
                timestamp,

            key:
                messageKey,

            stts:
                "Sent"
        };


        /*
        |--------------------------------------------------------------------------
        | Receiver Chat
        |--------------------------------------------------------------------------
        */

        const receiverChat = {

            typ:
                "txt",

            txt:
                message,

            From:
                fromUid,

            to:
                toUid,

            usrnm:
                senderUsername,

            pp:
                senderAvatar,

            timestamp:
                timestamp,

            key:
                messageKey,

            stts:
                "Delivered"
        };


        /*
        |--------------------------------------------------------------------------
        | Sender Inbox
        |--------------------------------------------------------------------------
        */

        const senderInbox = {

            lastMsg:
                message,

            msgType:
                "txt",

            lastMsgTime:
                Number(timestamp),

            from:
                fromUid,

            to:
                toUid,

            chatUserName:
                receiverUsername,

            chatUserPP:
                receiverAvatar,

            stts:
                "Sent"
        };


        /*
        |--------------------------------------------------------------------------
        | Receiver Inbox
        |--------------------------------------------------------------------------
        */

        const receiverInboxPath =
            `InboxList/${toUid}/${fromUid}`;


        /*
        |--------------------------------------------------------------------------
        | Read Existing Receiver Inbox
        |--------------------------------------------------------------------------
        */

        const existingReceiverInbox =
            await firebaseGet(
                DATABASE_URL,
                receiverInboxPath
            );


        let unreadCount = 0;


        if (
            existingReceiverInbox &&
            typeof existingReceiverInbox.unreadCount ===
                "number"
        ) {

            unreadCount =
                existingReceiverInbox.unreadCount;
        }


        unreadCount += 1;


        const receiverInbox = {

            lastMsg:
                message,

            msgType:
                "txt",

            lastMsgTime:
                Number(timestamp),

            from:
                fromUid,

            to:
                toUid,

            chatUserName:
                senderUsername,

            chatUserPP:
                senderAvatar,

            stts:
                "Delivered",

            unreadCount:
                unreadCount
        };


        /*
        |--------------------------------------------------------------------------
        | WRITE CHAT
        |--------------------------------------------------------------------------
        */

        await firebasePut(
            DATABASE_URL,
            `chat/${fromUid}/${toUid}/${messageKey}`,
            senderChat
        );


        await firebasePut(
            DATABASE_URL,
            `chat/${toUid}/${fromUid}/${messageKey}`,
            receiverChat
        );


        /*
        |--------------------------------------------------------------------------
        | WRITE INBOX
        |--------------------------------------------------------------------------
        */

        await firebasePatch(
            DATABASE_URL,
            `InboxList/${fromUid}/${toUid}`,
            senderInbox
        );


        await firebasePatch(
            DATABASE_URL,
            receiverInboxPath,
            receiverInbox
        );


        /*
        |--------------------------------------------------------------------------
        | SEND NOTIFICATION
        |--------------------------------------------------------------------------
        */

        const notification =
            await sendChatNotification({

                receiverToken:
                    receiverToken,

                senderUsername:
                    senderUsername,

                message:
                    message,

                senderAvatar:
                    senderAvatar,

                senderUid:
                    fromUid,

                receiverUid:
                    toUid,

                messageKey:
                    messageKey,

                mode:
                    mode
            });


        /*
        |--------------------------------------------------------------------------
        | SUCCESS
        |--------------------------------------------------------------------------
        */

        return json(
            res,
            200,
            {

                success:
                    true,

                message:
                    "Message sent successfully",

                messageKey:
                    messageKey,

                fromUid:
                    fromUid,

                toUid:
                    toUid,

                timestamp:
                    Number(timestamp),

                mode:
                    mode,

                notification:
                    notification
            }
        );


    } catch (error) {

        console.error(
            "send-message error:",
            error
        );


        return json(
            res,
            500,
            {

                success:
                    false,

                error:
                    "Internal server error"
            }
        );
    }
}
