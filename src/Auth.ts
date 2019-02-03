import { OAuth2Client } from "google-auth-library";

export default class Auth {

    private static readonly CLIENT_ID = "42166570332-0egs4928q7kfsnhh4nib3o8hjn62f9u5.apps.googleusercontent.com";
    private static client = new OAuth2Client(Auth.CLIENT_ID);

    public static verifyId(idToken: string): Promise<any> {
        return new Promise((resolve, reject) => {
            Auth.client.verifyIdToken({
                idToken,
                audience: Auth.CLIENT_ID,
            }).then((ticket) => {
                const payload =  ticket.getPayload();
                if (payload) {
                    if (payload.aud === Auth.CLIENT_ID && (payload.iss === "accounts.google.com" || payload.iss === "https://accounts.google.com")) {
                        resolve({
                            id: payload.sub,
                            name: payload.name,
                            email: payload.email,
                        });
                    }
                }
            }).catch(reject);
        });
    }
}
