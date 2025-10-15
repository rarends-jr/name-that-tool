"use client";
import { useState } from "react";
import { useEffect } from "react";
import Swal from 'sweetalert2';

export default function NameThatTool() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [inRoom, setInRoom] = useState(false);
  const [role, setRole] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  type Player = {
    name: string;
    priority: boolean;
    last_polled: string;
    active: number;
    score: number;
    match_score: number;
    prompt_match_score: number;
  };

  type GameState = {
    players: Player[];
    status: string;
    state_max?: number;
    state_timer: number;
    round_intro_text?: string;
    round_intro_audio?: string;
    round_intro_length?: number;
    round_outro_text?: string;
    round_outro_audio?: string;
    round_outro_length?: number;
    round_name?: string;
    question_image?: string;
    room_question_id?: string;
    room_round_id?: string;
  };

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [answerMatchScore, setAnswerMatchScore] = useState(-1);
  const [promptMatchScore, setPromptMatchScore] = useState(-1);

  async function createGame() {
    createRoom();
  }

  async function resumeGame() {
    setRole("host");
  }

  async function joinGame() {
    setRole("player");
  }

  async function startGame() {
    if (gameState){
      if (gameState.players.length < 4) {
        Swal.fire({
            title: 'More Players Needed',
            text: 'You must have at least four players to start.',
            icon: 'warning',
            confirmButtonText: 'Cool'
          });
      } else {
        setLoading(true);
        const res = await fetch("/api/rooms/status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: roomCode,
            status: "start_requested",
          }),
        });
        const data = await res.json();
        setLoading(false);
        if (!data.success) {
          setError(data.error);
        } else {
          setError("");
        }
      }
    }
  }

  async function cancelStart() {
    setLoading(true);
    const res = await fetch("/api/rooms/status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: roomCode,
        status: "waiting",
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.success) {
      setError(data.error);
    } else {
      setError("");
    }
  }
  
  async function exitGame() {
    setLoading(true);
    const res = await fetch("/api/players/exit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: roomCode,
        name: playerName,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.success) {
      setError(data.error);
    } else {
      setError("");
      setInRoom(false); 
      setRoomCode("");
      setPlayerName("");
      setGameState(null);
    }
  }

  async function submitAnswer() {
    if (currentAnswer.trim() === "") {
      setError("Answer cannot be empty.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/players/answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: roomCode,
        name: playerName,
        room_question_id: gameState ? gameState.room_question_id : null,
        answer: currentAnswer,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.success) {
      setError(data.error);
    } else {
      setError("");
      setAnswerMatchScore(data.data.match_score);
      setCurrentAnswer("");
    }
  }

  async function submitPrompt() {
    if (currentAnswer.trim() === "") {
      setError("Prompt cannot be empty.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/players/prompt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: roomCode,
        name: playerName,
        room_round_id: gameState ? gameState.room_round_id : null,
        tool_name: currentAnswer,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.success) {
      setError(data.error);
    } else {
      setError("");
      setPromptMatchScore(data.data.prompt_match_score);
    }
  }

  async function createRoom(){
    setLoading(true);
    const res = await fetch("/api/rooms/activate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      //todo pass in user creds
      // body: JSON.stringify({ 
        // user: userId
      // }),
    });
    const json = await res.json();

    setLoading(false);
    setRole("host");
    setRoomCode(json.data.code);
    setInRoom(true);
  }

  async function isRoomValid(){
    let res;
    if (role === "player"){
      res = await fetch("/api/rooms/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          code: roomCode,
          name: playerName,
        }),
      });
    }else{
      const params = new URLSearchParams();
      params.append('code', roomCode);
      res = await fetch(`/api/rooms?${params.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
    }
    
    const data = await res.json();
    if (!data.success){
      setError(data.error);
    }else{
      setError("");
    }
    return data.success;
  }

  async function fetchGameState(){
    if (inRoom){
      let res;
      if (role === "host"){//host steps, all users poll for status
        res = await fetch("/api/rooms/step", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            code: roomCode
          }),
        });
      }

      
      const params = new URLSearchParams();
      params.append('code', roomCode);
      params.append('role', role);
      params.append('playerName', playerName);
      res = await fetch(`/api/rooms/status?${params.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      
      const data = await res.json();
      console.log("fetched game state:", data);
      if (role === "player" && data.data.status === "asking_questions"){
        setAnswerMatchScore(data.data.players[0].match_score);
      }else if (role === "player" && data.data.status === "prompting_questions"){
        setPromptMatchScore(data.data.players[0].prompt_match_score);
      }
      setGameState(data.data);
    }
  }
  
  async function joinRoom(){
    setLoading(true);
    const roomValid = await isRoomValid();
    setLoading(false);
    if (roomValid){
      setInRoom(true);
    }
  }

  let timer = (<></>);
  let content;
  let roomCodeDom = (<></>);
  if (inRoom && roomCode){
    roomCodeDom = (<>
      <label htmlFor="roomCode">Room Code:&nbsp;</label><span id="roomCode" className="badge rounded-pill bg-warning text-dark">{roomCode}</span>
    </>);
  }
  if (loading){
    content = (
      <div className="row justify-content-center">
        <div className="col-sm-12 m-2 text-center spinner-border" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }else{
    if (role == "host"){
      if (!inRoom){
        content = (
          <div className="row">
            <h1 className="m-2 text-center">Our Gracious Host</h1>
            <div className="col-sm-12 m-2 text-center">
              <label className="m-2 text-center" htmlFor="roomCode">Enter Room Code:</label>
              <input className="" id="roomCode" value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())}></input>
            </div>
            <div className="col-sm-12 text-center">
              <button className="col-lg-2 col-md-4 col-sm-12 m-2 text-center btn btn-primary" onClick={joinRoom}>Join as Host</button>
              </div>
          </div>
        );
      }else{
        let host = "Our Gracious Host";
        let players = (<></>);
        let button = (<></>);
        let answer = (<></>);
        if (gameState){
          players = (
            <div className="col-sm-12 text-center">
              <h2 className="m-2">Players:</h2>
              <ul className="list-group">
                {gameState.players.map((player: any) => (
                  <li key={player.name} className={`list-group-item ${player.match_score >= 0 || player.prompt_match_score >= 0 ? 'text-success' : player.active === "1" ? 'text-primary' : 'text-secondary'}`}>
                    {player.name} - {player.score}
                  </li>
                ))}
              </ul>
            </div>
          );
          if (gameState.status === "waiting"){
            button = (
              <button className="col-lg-2 col-md-4 col-sm-12 m-2 text-center btn btn-primary" onClick={startGame}>Start Game</button>
            );
          } else if (gameState.status === "start_requested" || gameState.status === "starting_game"){
            console.log("cancel button rendered?");
            button = (
              <button className="col-lg-2 col-md-4 col-sm-12 m-2 text-center btn btn-primary" onClick={cancelStart}>Cancel Start</button>
            );
          } else if (gameState.status === "introducing_game"){
            answer = (
              <div className="col-sm-12 text-center">
                <audio src="https://name-that-tool.s3.us-east-1.amazonaws.com/voice_clips/game_intro.mp3" autoPlay></audio>
                <h3>Welcome to Name That Tool! In this game, you'll be shown images of tools, and for every tool you can name, you'll get points! There's no penalty for guessing wrong, so make sure to enter something before time runs out!<br></br>
<br></br>
There are three rounds, and more points are available the later you get into the game. Likewise, the tools will become more obscure as the rounds advance, so even if you fall behind early, don't give up! Everybody loves a good comeback story!<br></br>
<br></br>
Best of luck to all of our players!</h3>
              </div>
            );
          } else if (gameState.status === "starting_round"){
            host = gameState.round_name ?? host;
            answer = (
              <div className="col-sm-12 text-center">
                <audio src={`https://name-that-tool.s3.us-east-1.amazonaws.com/voice_clips/${gameState.round_intro_audio}`} autoPlay></audio>
                <h3>{gameState.round_intro_text}</h3>
              </div>
            );
          } else if (gameState.status === "ending_round"){
            host = gameState.round_name ?? host;
            answer = (
              <div className="col-sm-12 text-center">
                <audio src={`https://name-that-tool.s3.us-east-1.amazonaws.com/voice_clips/${gameState.round_outro_audio}`} autoPlay></audio>
                <h3>{gameState.round_outro_text}</h3>
              </div>
            );
          } else if (gameState.status === "asking_questions" && gameState.question_image) {
            host = gameState.round_name ?? host;
            answer = (
              <div className="col-sm-12 text-center">
                <img src={gameState.question_image} alt="What is this Tool?" className="img-fluid" style={{ maxHeight: "400px", width: "auto" }} />
              </div>
            );  
          } else if (gameState.status === "prompting_questions") {
            host = gameState.round_name ?? host;
            answer = (
              <div className="col-sm-12 text-center">
                <h3>It's time to demonstrate your superior tool knowledge...</h3>
              </div>
            );  
          }
          if (gameState.state_timer && gameState.state_timer >= 0) {
            timer = (
              <div className="row justify-content-center m-2">
                <h2 className="col-sm-12 text-center text-warning">
                  Time Remaining: {gameState.state_timer} seconds
                </h2>
                <progress max={gameState.state_max??gameState.state_timer} value={gameState.state_timer}></progress>
              </div>
            );
          }
        }
        
        content = (
          <div className="row justify-content-center">
            <h1 className="col-sm-12 text-center m-2">{host}</h1>
            {answer}
            <br></br>
            {players}
            {button}
          </div>
        );
      }
    }else if (role == "player"){
      if (!inRoom){
        content = (
          <div className="row justify-content-center">
            <div className="col-sm-12 m-2 text-center">
              <label className="m-2 text-center" htmlFor="playerName">Your Name:</label>
              <input className="" id="playerName" value={playerName} onChange={e => setPlayerName(e.target.value.toUpperCase())}></input>
            </div>          
            <div className="col-sm-12 m-2 text-center">
              <label className="m-2 text-center" htmlFor="roomCode">Enter Room Code:</label>
              <input className="" id="roomCode" value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())}></input>
            </div>
            <div className="col-sm-12 text-center">
              <button className="col-lg-2 col-md-4 col-sm-12 m-2 text-center btn btn-primary" onClick={joinRoom}>Join as Player</button>
            </div>
          </div>
        );
      }else{
        let button = (<></>);
        if (gameState){
          if (gameState.status === "waiting"){
            button = (
              <button className="col-lg-2 col-md-4 col-sm-12 m-2 text-center btn btn-danger" onClick={exitGame}>Exit Game</button>
            );
          }
          if (gameState.status === "asking_questions"){
            if (answerMatchScore > 10){
              button = (
                <div className="col-sm-12 m-2 text-center">This is your prompt, relax!</div>
              );
            } else if (answerMatchScore >= 0) {
              button = (
                <div className="col-sm-12 m-2 text-center">Your answer has been recorded</div>
              );
            } else {
              button = (
                <div className="col-sm-12 m-2 text-center">
                  <label className="m-2 text-center" htmlFor="currentAnswer">Your Answer:</label>
                  <input className="" id="currentAnswer" value={currentAnswer} onChange={e => setCurrentAnswer(e.target.value.toUpperCase())}></input>
                  <br></br>
                  <button className="col-lg-2 col-md-4 col-sm-12 m-2 text-center btn btn-primary" onClick={submitAnswer}>Submit Answer</button>
                </div>
              );
            }
          } else if (gameState.status === "prompting_questions"){
            if (promptMatchScore >= 7){
              button = (
                <div className="col-sm-12 m-2 text-center">Your tool prompt has been recorded</div>
              );
            } else {
              button = (
                <div className="col-sm-12 m-2 text-center">
                  <label className="m-2 text-center" htmlFor="currentAnswer">Your Tool:</label>
                  <input className="" id="currentAnswer" value={currentAnswer} onChange={e => setCurrentAnswer(e.target.value.toUpperCase())}></input>
                  <br></br>
                  <button className="col-lg-2 col-md-4 col-sm-12 m-2 text-center btn btn-primary" onClick={submitPrompt}>Submit Tool Prompt</button>
                </div>
              );
            }
          }
          if (gameState.state_timer && gameState.state_timer >= 0) {
            timer = (
              <div className="row justify-content-center m-2">
                <h2 className="col-sm-12 text-center text-warning">
                  Time Remaining: {gameState.state_timer} seconds
                </h2>
                <progress max={gameState.state_max??gameState.state_timer} value={gameState.state_timer}></progress>
              </div>
            );
          }
        }
        content = (
          <div className="row justify-content-center">
            <h1 className="col-sm-12 text-center m-2">{playerName}</h1>
            <br></br>
            {button}
          </div>
        );
      }
    }else{
      content = (
        <div className="row justify-content-center">
          <button className="col-lg-2 col-md-4 col-sm-12 btn btn-primary m-2 border" onClick={createGame}>Host Game</button>
          <button className="col-lg-2 col-md-4 col-sm-12 btn btn-secondary m-2 border" onClick={resumeGame}>Resume Hosting Game</button>
          <button className="col-lg-2 col-md-4 col-sm-12 btn btn-success m-2 border" onClick={joinGame}>Join Game</button>
        </div>
      );
    }
  }

  useEffect(() => {
    fetchGameState(); // Initial fetch when component mounts

    const intervalId = setInterval(fetchGameState, 1000); // Poll every 1000ms

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [inRoom, roomCode, role, playerName]); // Re-run effect if these things change


  return (
    <>
      <div className="row justify-content-center m-2">
          <img src="/images/splash.png" alt="Name That Tool Splash" className="img-fuild" style={{ maxWidth: "816px", width: "100%", height: "auto" }}></img>
      </div>
      <div className="row justify-content-center m-2">
        <h2 className="col-sm-12 text-center"><label className="m-2" htmlFor="url">Join Now:&nbsp;</label><span id="url" className="badge rounded-pill bg-info text-dark">randolpharends.dev</span> {roomCodeDom} </h2>
      </div>
      {timer}
      <div className="row justify-content-center m-2">
        <h2 className="col-sm-12 text-center text-danger">{error}</h2>
      </div>
      {content}      
    </>
  );
}
