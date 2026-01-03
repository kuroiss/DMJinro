import { DiscordSDK } from "@discord/embedded-app-sdk";

const client_id = process.env.REACT_APP_DISCORD_CLIENT_ID;

const discordSdk = new DiscordSDK(client_id);

const setupDiscordSdk = async () => {
    await discordSdk.ready();
    console.log("Discord SDK is ready");

    // Authorize with Discord Client
    const { code } = await discordSdk.commands.authorize({
      client_id: client_id,
      response_type: "code",
      state: "",
      prompt: "none",
      scope: [
        "identify",
        "guilds",
        "applications.commands"
      ],
    });

    // Retrieve an access_token from your activity's server
    const response = await fetch("/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
      }),
    });

    const { access_token } = await response.json();

    // Authenticate with Discord client (using the access_token)
    const auth_result = await discordSdk.commands.authenticate({
      access_token,
    });

    if (auth_result == null) {
      throw new Error("Authenticate command failed");
    }
    else
    {
      console.log("Authenticate command succeeded");
    }

    return auth_result;
  };

export { setupDiscordSdk };
export default discordSdk;
