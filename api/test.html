const USERS_DATABASE_URL =
    "https://appnetick-default-rtdb.firebaseio.com";

const OTP_UID =
    "UJ1G3C70YMT59RUGB";

const NOTIFICATION_URL =
    "https://chat-notification-server.onrender.com/send";

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

    if (!text || text === "null") {
        return null;
    }

    return JSON.parse(text);
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
| Chat Notification
|--------------------------------------------------------------------------
*/

async function sendNotification({
    receiverToken,
    senderUsername,
    message,
    senderAvatar,
    senderUid,
    receiverUid
}) {

    if (!receiverToken) {

        return {
            sent: false,
            reason:
                "Receiver FCM token not found"
        };
    }

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
            "OtpChat",

        receiverUid:
            receiverUid
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

    let result;

    try {
        result = JSON.parse(text);
    } catch {
        result = text;
    }

    if (!response.ok) {

        return {
            sent: false,
            status:
                response.status,
            response:
                result
        };
    }

    return {
        sent: true,
        status:
            response.status,
        response:
            result
    };
}

/*
|--------------------------------------------------------------------------
| Main
|--------------------------------------------------------------------------
*/

export default async function handler(
    req,
    res
) {

    if (req.method !== "POST") {

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

        const body =
            req.body || {};

        const action =
            safeString(body.action);

        const toUid =
            safeString(body.toUid);

        const message =
            safeString(body.message);

        if (!toUid) {

            return json(
                res,
                400,
                {
                    success: false,
                    error:
                        "Receiver UID is required"
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
                        "Message is required"
                }
            );
        }

        if (
            action !== "chat" &&
            action !== "notification" &&
            action !== "both"
        ) {

            return json(
                res,
                400,
                {
                    success: false,
                    error:
                        "Invalid action"
                }
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Fixed testing sender
        |--------------------------------------------------------------------------
        */

        const fromUid =
            OTP_UID;

        /*
        |--------------------------------------------------------------------------
        | Sender
        |--------------------------------------------------------------------------
        */

        const senderUser =
            await firebaseGet(
                USERS_DATABASE_URL,
                `Users/${encodeURIComponent(fromUid)}`
            );

        if (!senderUser) {

            return json(
                res,
                404,
                {
                    success: false,
                    error:
                        "Testing sender account not found",
                    uid:
                        fromUid
                }
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Receiver
        |--------------------------------------------------------------------------
        */

        const receiverUser =
            await firebaseGet(
                USERS_DATABASE_URL,
                `Users/${encodeURIComponent(toUid)}`
            );

        if (!receiverUser) {

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

        const senderUsername =
            getUsername(senderUser) ||
            "OTP Verification";

        const senderAvatar =
            getAvatar(senderUser);

        const receiverToken =
            getFcmToken(receiverUser);

        const result = {

            success: true,

            senderUid:
                fromUid,

            receiverUid:
                toUid,

            senderUsername:
                senderUsername,

            action:
                action
        };

        /*
        |--------------------------------------------------------------------------
        | Notification Only
        |--------------------------------------------------------------------------
        */

        if (
            action === "notification" ||
            action === "both"
        ) {

            result.notification =
                await sendNotification({
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
                        toUid
                });
        }

        /*
        |--------------------------------------------------------------------------
        | Chat
        |--------------------------------------------------------------------------
        |
        | Existing send-message API is used here.
        |
        |--------------------------------------------------------------------------
        */

        if (
            action === "chat" ||
            action === "both"
        ) {

            const expectedSecret =
                safeString(
                    process.env.MESSAGE_API_SECRET
                );

            if (!expectedSecret) {

                return json(
                    res,
                    500,
                    {
                        success: false,
                        error:
                            "MESSAGE_API_SECRET is not configured"
                    }
                );
            }

            /*
            |--------------------------------------------------------------------------
            | Instead of exposing the secret to browser,
            | server calls existing API.
            |--------------------------------------------------------------------------
            */

            const host =
                req.headers.host;

            const protocol =
                req.headers["x-forwarded-proto"] ||
                "https";

            const apiUrl =
                `${protocol}://${host}/api/send-message`;

            const response =
                await fetch(
                    apiUrl,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            "X-Message-API-Secret":
                                expectedSecret
                        },

                        body:
                            JSON.stringify({
                                mode:
                                    "otp",

                                toUid:
                                    toUid,

                                message:
                                    message
                            })
                    }
                );

            const text =
                await response.text();

            let data;

            try {
                data =
                    JSON.parse(text);
            } catch {
                data = {
                    raw:
                        text
                };
            }

            result.chat = {

                sent:
                    response.ok &&
                    data?.success === true,

                status:
                    response.status,

                response:
                    data
            };
        }

        /*
        |--------------------------------------------------------------------------
        | Overall result
        |--------------------------------------------------------------------------
        */

        const chatOk =
            !result.chat ||
            result.chat.sent === true;

        const notificationOk =
            !result.notification ||
            result.notification.sent === true;

        result.success =
            chatOk &&
            notificationOk;

        return json(
            res,
            result.success
                ? 200
                : 500,
            result
        );

    } catch (error) {

        console.error(
            "test-send error:",
            error
        );

        return json(
            res,
            500,
            {
                success: false,
                error:
                    error.message ||
                    "Internal server error"
            }
        );
    }
}
