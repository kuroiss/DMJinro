import express, { application } from "express";
import http from "http";
import { WebSocket, WebSocketServer } from "ws";
import dotenv from "dotenv";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

import {
  getRandom,
  getVilWolfNumber,
  getCardType,
  getCardAbility,
  getCardColor
} from "./common/util.js";
dotenv.config({ path: "../.env" });



// common parts
const app = express();
const port = 3000;

// 各チャンネルの状態
const channels = {};
const channelGameStarted = {};
const channelWolfIndex = {};
const channelReadyStatus = {};
const channelSubmission = {};
const channelVote = {};

// Allow express to parse JSON bodies
app.use(express.json());
app.use(express.text());

// API Block
app.post("/api/token", async (req, res) => {
  console.log("called /api/token");

  // Exchange the code for an access_token
  const response = await fetch(`https://discord.com/api/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code: req.body.code,
    }),
  });

  // Retrieve the access_token from the response
  const { access_token } = await response.json();

  // Return the access_token to our client as { access_token: "..."}
  res.send({access_token});
});


app.post("/api/start", (req, res) => {
  console.log("called /api/start API");
  const { channel } = req.query;

  if (!channel || !channels[channel]) {
    return res.status(404).json({ error: "channel not found" });
  }

  // 3人以上いないとゲームを開始できないようにする
  const channel_length = channels[channel].size;
  if(channel_length < 2)
  {
    console.log("なんかしらの原因で規定人数が集まっていないらしい");
    console.log("channels[channel].length : ", channel_length);
    res.json({ ok: false });
  }
  else
  {

    // ゲーム開始状態にする
    channelGameStarted[channel] = true;

    // 指定したstartを送ってきたチャンネルの全ての人に対して、スタート信号を送信する
    const wolf_index = getRandom(channel_length);
    channelWolfIndex[channel] = wolf_index;
    const [vil_number, wolf_number] = getVilWolfNumber();
    const card_type = getCardType();
    const card_ability = getCardAbility();
    const card_color = getCardColor();
    console.log("wolf_index : ", wolf_index);
    console.log("vil_number : ", vil_number);
    console.log("wolf_number : ", wolf_number);
    let count = 0;
    for(const ws of channels[channel])
    {
      const payload = JSON.stringify({
        type: "start",
        number: (count == wolf_index) ? wolf_number : vil_number,
        card_type: card_type,
        card_ability: card_ability,
        card_color: card_color
      });

      ws.send(payload);
      ++count;
    }
    res.json({ ok: true });
  }
});


app.post("/api/write_start", (req, res) => {
  const { channel, userId } = req.query;
  console.log(`called /api/start API from ${channel}.${userId}`);

  if (!channel || !channels[channel] || !channelGameStarted[channel]) {
    return res.status(404).json({ error: "channel not found" });
  }

  if(!channelReadyStatus[channel])
  {
    channelReadyStatus[channel] = new Set();
  }
  channelReadyStatus[channel].add(userId);

  if(channelReadyStatus[channel].size == channels[channel].size)
  {
    const payload = JSON.stringify({
      type: "write_start"
    });
    for(const ws of channels[channel])
    {
      ws.send(payload);
    }
  }

  res.json({ok: true});
});


app.post("/api/submission", (req, res) => {
  const {channel, userId, globalName} = req.query;
  console.log(`called /api/submission API from ${channel}.${userId}`);

  if (!channel || !channels[channel] || !channelGameStarted[channel]) {
    return res.status(404).json({ error: "channel not found" });
  }

  if(!channelSubmission[channel])
  {
    channelSubmission[channel] = {};
  }
  channelSubmission[channel][userId] = {
    globalName: globalName,
    submission: req.body
  };

  console.log("channelSubmission[channel]: ", channelSubmission[channel]);

  if(Object.values(channelSubmission[channel]).length == channels[channel].size)
  {
    const payload = JSON.stringify({
      type: "end_submission",
      submissions: channelSubmission[channel]
    });
    for(const ws of channels[channel])
    {
      ws.send(payload);
    }

    console.log("send all submissions");
  }

  res.json({ok: true});
});

app.post("/api/vote", (req, res) => {
  const {channel, userId, globalName} = req.query;
  console.log(`called /api/vote API from ${channel}.${userId}`);

  if (!channel || !channels[channel] || !channelGameStarted[channel]) {
    return res.status(404).json({ error: "channel not found" });
  }

  if(!channelVote[channel])
  {
    channelVote[channel] = {};
    Object.keys(channelSubmission[channel]).map((key) => {
      channelVote[channel][key] = [];
    });
  }
  const vote_user_id = req.body;
  channelVote[channel][vote_user_id].push(
    {
      userId: userId,
      globalName: globalName
    }
  );

  var voted_user_length = 0;
  Object.keys(channelVote[channel]).map((key) => {
    voted_user_length += channelVote[channel][key].length;
  });

  if(voted_user_length == channels[channel].size)
  {
    const votedUsers = Object.entries(channelVote[channel])
      .filter(([_, arr]) => arr.length === maxLength)
      .map(([key]) => key);
    const votedUser = votedUsers.length > 1 ? null : votedUsers[0];

    // const votedUser = Object.entries(channelVote[channel]).reduce(
    //   (max, [key, arr]) =>
    //     arr.length > max.length
    //       ? { key, length: arr.length }
    //       : max,
    //   { key: null, length: -1 }
    // );

    var isWolfWon = false;
    var count = 0;
    for(const ws of channels[channel])
    {
      const isWolf = count == channelWolfIndex[channel];
      if(isWolf)
      {
        if(ws.userId != votedUser || votedUsers == null)
        {
          isWolfWon = true;
        }
      }
      ++count;
    }
    count = 0;

    for(const ws of channels[channel])
    {
      const isWolf = count == channelWolfIndex[channel];
      const payload = JSON.stringify({
        type: "vote_result",
        votes: channelVote[channel],
        isVoted: ws.userId == votedUser,
        isWolf: isWolf,
        isWon: isWolf === isWolfWon
      });

      ws.send(payload);
      ++count;
    }
    console.log("send all votes");
  }

  res.json({ok: true});

});

app.post("/api/end", (req, res) => {
  const {channel, userId} = req.query;
  console.log(`called /api/end API from ${channel}.${userId}`);

  if (!channel || !channels[channel] || !channelGameStarted[channel]) {
    return res.status(404).json({ error: "channel not found" });
  }

  delete channelGameStarted[channel];
  delete channelWolfIndex[channel];
  delete channelReadyStatus[channel];
  delete channelSubmission[channel];
  delete channelVote[channel];

  res.json({ok: true});
});


// page
const __filename = fileURLToPath(import.meta.url)
const __build_dir_path = path.join(path.dirname(__filename), "../client/build")
app.use(express.static(__build_dir_path));

app.get("*", (req, res) => {
  res.sendFile(path.join(__build_dir_path, "index.html"));
});


// WebSocket Block
const server = http.createServer(app);
const wss = new WebSocketServer({server, path: "/api/ws"});

wss.on("connection", (ws, req) => {
  const urlParams = new URLSearchParams(req.url?.split("?")[1]);
  const channel = urlParams.get("channel");
  const userId = urlParams.get("userId");
  const globalName = urlParams.get("globalName");

  // クエリにchannelがなければ、その接続を維持しない
  if (!channel) {
    ws.close();
    return;
  }

  // 入力されたチャンネルが存在しないなら、そのチャンネル用のsetを追加する
  if (!channels[channel]) {
    channels[channel] = new Set();

    // 最初に接続しに来た人の時点で、スタートゲーム開始状態を初期化しておく
    channelGameStarted[channel] = false;
  }

  // 該当するチャンネルに、WebSocketインスタンスを保持する
  ws.userId = userId;
  ws.globalName = globalName;
  channels[channel].add(ws);
  console.log(`Client(ID : ${ws.userId}) connected to channel: ${channel}`);

  // const intervalId = setInterval(() => {
  //   if (ws.readyState === WebSocket.OPEN) {
  //     const randomValue = Math.floor(Math.random() * 100); // 0〜99
  //     ws.send(
  //       JSON.stringify({
  //         type: "random",
  //         value: randomValue
  //       })
  //     );
  //   }
  // }, 10_000);

  ws.on("message", (data, isBinary) => {
    // try {
    //   const message = JSON.parse(data.toString());
    //   if (!channels[channel].data) {
    //     channels[channel].data = {};
    //   }
    //   channels[channel].data = { ...channels[channel].data, ...message };

    //   console.log("Current channel data:", channels[channel].data);

    //   for (const client of channels[channel]) {
    //     if (client.readyState === WebSocket.OPEN) {
    //       client.send(JSON.stringify(channels[channel].data), {
    //         binary: isBinary,
    //       });
    //     }
    //   }
    // } catch (e) {
    //   console.log("Received non-JSON message");
    // }
  });

  ws.on("close", () => {
    // clearInterval(intervalId);
    channels[channel].delete(ws);
    if (channels[channel].size === 0) {
      delete channels[channel];
      delete channelGameStarted[channel];
      delete channelWolfIndex[channel];
      delete channelReadyStatus[channel];
      delete channelSubmission[channel];
      delete channelVote[channel];
    }
    console.log(`Client disconnected from channel: ${channel}`);
  });
});


// listen
server.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
