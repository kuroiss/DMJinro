import { useEffect, useState } from "react";
import { GAME_STATUS } from "../common/constants";
import "./overlay.css";

const Overlay = ({
    setIsOverlay,
    gameStatus,
    channel,
    userId,
    globalName,
    cost,
    type,
    ability,
    color,
    submissions,
    votes,
    isVoted,
    isWolf,
    isWon
}) => {
    const deleteOverlay = () => {
        setIsOverlay(() => false);
    }

    return(
        <div className="overlay-background">
            {gameStatus == GAME_STATUS.START &&(
                <StartScreen
                    channel={channel}
                    userId={userId}
                    cost={cost}
                    type={type}
                    ability={ability}
                    color={color}
                 />
            )}
            {gameStatus == GAME_STATUS.WRITE &&(
                <WriteScreen
                    channel={channel}
                    userId={userId}
                    globalName={globalName}
                    cost={cost}
                    type={type}
                    ability={ability}
                    color={color}
                 />
            )}
            {gameStatus == GAME_STATUS.VOTE &&(
                <VoteScreen
                    channel={channel}
                    userId={userId}
                    globalName={globalName}
                    cost={cost}
                    type={type}
                    ability={ability}
                    color={color}
                    submissions={submissions}
                 />
            )}
            {gameStatus == GAME_STATUS.RESULT &&(
                <ResultScreen
                    channel={channel}
                    userId={userId}
                    cost={cost}
                    type={type}
                    ability={ability}
                    color={color}
                    submissions={submissions}
                    votes={votes}
                    isVoted={isVoted}
                    isWolf={isWolf}
                    isWon={isWon}
                    deleteCallback={deleteOverlay}
                 />
            )}
        </div>
    );
};

export default Overlay;

const StartScreen = ({channel, userId, cost, type, ability, color}) => {
    const [started, setStarted] = useState(false);

    const postStartWrite = async () => {
        const response = await fetch(
            `/api/write_start?channel=${channel}&userId=${userId}`,
            {
                method: "POST"
            }
        );

        setStarted(true);
    };

    return (
        <div className="screen-background">
            <h3 className="overlay-text">ゲームスタート！</h3>
            <h4>あなたのコスト : {cost}</h4>
            <h4>カードタイプ : {type}</h4>
            <h4>カードの能力 : {ability}</h4>
            <h4>カードの文明 : {color}</h4>
            <button
            className="overlay-button"
            onClick={postStartWrite}
            disabled={started}
            >
                OK
            </button>
        </div>
    );
};

const WriteScreen = ({channel, userId, globalName, cost, type, ability, color}) => {
    const [submitted, setSubmitted] = useState(false);

    const postSubmission = async () => {
        const element = document.getElementById("submission");

        const response = await fetch(
            `/api/submission?channel=${channel}&userId=${userId}&globalName=${globalName}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain",
                },
                body: element.value
            }
        );

        setSubmitted(true);
    };

    return (
        <div className="screen-background">
            <h4>コスト : {cost}</h4>
            <h4>カードタイプ : {type}</h4>
            <h4>能力 : {ability}</h4>
            <h4>文明 : {color}</h4>

            <textarea
            id="submission"
            type="text"
            className="screen-text-box"
            placeholder="ここに能力を記載してください"
            />

            <button
            className="overlay-button"
            onClick={postSubmission}
            disabled={submitted}
            >
                提出
            </button>
        </div>
    );
}

const VoteScreen = ({channel, userId, globalName, cost, type, ability, color, submissions}) => {
    return (
        <div className="screen-background">
            <h4>コスト : {cost}</h4>
            <h4>カードタイプ : {type}</h4>
            <h4>能力 : {ability}</h4>
            <h4>文明 : {color}</h4>

            <SubmissionList
            channel={channel}
            userId={userId}
            globalName={globalName}
            submissions={submissions}/>
        </div>
    );
}

const SubmissionList = ({channel, userId, globalName, submissions, isVote=true}) => {
    const postVote = async (id) => {
        const response = await fetch(
            `/api/vote?channel=${channel}&userId=${userId}&globalName=${globalName}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain",
                },
                body: id
            }
        );
    };

    return(
        <div className="screen-background">
        {
            Object.entries(submissions).map(([id, submission], index) => (
                <div className="vote-container">
                    <div className="candidate-container">
                        <li className="overlay-text">{submission.globalName}</li>
                        <div className="candidate-text">
                            {submission.submission}
                        </div>
                    </div>
                    {isVote &&
                        <button
                        className="overlay-button"
                        onClick={() => {postVote(id)}}
                        >
                            投票
                        </button>
                    }
                </div>
            ))
        }
        </div>
    );
}

const ResultScreen = ({channel, userId, cost, type, ability, color, submissions, votes, isVoted, isWolf, isWon, deleteCallback}) => {
    const postEndGame = async () => {
        const response = await fetch(
            `/api/end?channel=${channel}&userId=${userId}`,
            {
                method: "POST"
            }
        );

        await deleteCallback();
    };

    return (
        <div className="screen-background">
            <ResultPane
            votes={votes}
            isVoted={isVoted}
            isWolf={isWolf}
            isWon={isWon}
            />

            <h4>コスト : {cost}</h4>
            <h4>カードタイプ : {type}</h4>
            <h4>能力 : {ability}</h4>
            <h4>文明 : {color}</h4>

            <SubmissionList
            channel={channel}
            userId={userId}
            submissions={submissions}
            isVote={false}
            />

            <button
            className="overlay-button"
            onClick={postEndGame}
            >
                ゲーム終了
            </button>

        </div>
    );
}

const ResultPane = ({votes, isVoted, isWolf, isWon}) => {
    return(
        <div className="screen-bakground">
            <h1>あなたは {isWon ? "勝利" : "敗北"} しました</h1>
            <h3>あなたの役職 : {isWolf ? "人狼" : "村人"}</h3>

            <h3>投票結果</h3>
            {
                Object.keys(votes).map((value, index) => (
                    <li>{value.globalName}に投票した人 : {getVotedUserIdStr(votes[value.id])}</li>
                ))
            }
        </div>
    );
};

const getVotedUserIdStr = (array) => {
    var name_str = "";
    array.map((value, index) => {
        name_str += value.globalName + ", ";
    });

    return name_str;
}
