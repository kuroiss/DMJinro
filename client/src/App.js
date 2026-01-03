import { useEffect, useState } from "react";
import discordSdk, { setupDiscordSdk } from "./component/common/Discord";
import Overlay from "./component/overlay/overlay";
import { GAME_STATUS } from "./component/common/constants";
import useWebSocket from "./component/common/useWebSocket";

import "./App.css";

export default function App() {
  const [auth, setAuth] = useState(null);
  const [yourName, setYourName] = useState("");
  const [authMessage, setAuthMessage] = useState("not auth");
  const [participant, setParticipant] = useState([]);
  const [debugStr, setDebugStr] = useState("");
  const [isOverlay, setIsOverlay] = useState(false);
  const [socket , addSocket] = useWebSocket({userId: auth?.user?.id, globalName: auth?.user?.global_name});
  const [vilNumber, setVilNumber] = useState(-1);
  const [cardType, setCardType] = useState("");
  const [cardAbility, setCardAbility] = useState("");
  const [cardColor, setCardColor] = useState("");
  const [gameStatus, setGameStatus] = useState(GAME_STATUS.INVALID);
  const [submissions, setSubmissions] = useState([]);
  const [votes, setVotes] = useState({});
  const [isVoted, setIsVoted] = useState(false);
  const [isWolf, setIsWolf] = useState(false);
  const [isWon, setIsWon] = useState(false);

  const getActivityParticipants = async () => {
    if(discordSdk.channelId != null && discordSdk.guildId != null)
    {
      const participants = await discordSdk.commands.getInstanceConnectedParticipants();
      let current_participants = [];
      for(const part of participants.participants)
      {
        current_participants.push(
          {
            id: part.id,
            globalName: part.global_name
          }
        );
      }
      setParticipant(current_participants);
    }
  }

  const postGameStart = async () => {
    if(auth != null)
    {
      const response = await fetch(
        `/api/start?channel=${discordSdk.channelId}`,
        {
          method: "POST"
        }
      );
    }
  };

  const displayOverlay = () => {
    setIsOverlay(true);
  };

  useEffect(() => {
    (async () => {
      const auth_result = await setupDiscordSdk();
      if(auth_result != null)
      {
        setAuth(auth_result);
      }
    })();
  }, []);

  useEffect(() => {
    if(auth != null)
    {
      console.log("write authorized process here");
      console.log("auth: ", auth);
      setYourName(auth.user.global_name);
      getActivityParticipants();

      discordSdk.subscribe("ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE", getActivityParticipants);
    }
  }, [auth]);

  useEffect(() => {
    switch(socket?.type)
    {
      case "start":
        setVilNumber(socket.number);
        setCardType(socket.card_type);
        setCardAbility(socket.card_ability);
        setCardColor(socket.card_color);
        setGameStatus(GAME_STATUS.START);
        displayOverlay();
        break;

      case "write_start":
        setGameStatus(GAME_STATUS.WRITE);
        break;

      case "end_submission":
        setGameStatus(GAME_STATUS.VOTE);
        setSubmissions(socket.submissions);
        break;

      case "vote_result":
        setGameStatus(GAME_STATUS.RESULT);
        setVotes(socket.votes);
        setIsVoted(socket.isVoted);
        setIsWolf(socket.isWolf);
        setIsWon(socket.isWon);
        break;

      case "random":
        setDebugStr(socket.value);
        break;

      default:
        break;
    }
  }, [socket]);

  return (
    <div className="App-header">
      {/* <h5>{debugStr}</h5> */}
      <h3>あなたの名前 : {yourName}</h3>
      <h2>参加者一覧</h2>
      { participant?.map((value, index) => (
        <li key={index}>{value.globalName}</li>
      ))}
      <button
        className="test-button"
        onClick={postGameStart}
        disabled={(auth == null) || (participant?.length < 2)}>
          ゲームスタート！
      </button>

      {isOverlay &&
        <Overlay
          setIsOverlay={setIsOverlay}
          gameStatus={gameStatus}
          channel={discordSdk.channelId}
          userId={auth?.user?.id}
          globalName={auth?.user?.global_name}
          participant={participant}
          cost={vilNumber}
          type={cardType}
          ability={cardAbility}
          color={cardColor}
          submissions={submissions}
          votes={votes}
          isVoted={isVoted}
          isWolf={isWolf}
          isWon={isWon}
        />
      }
    </div>
  );
};

