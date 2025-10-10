"use client";
import { Content } from "next/font/google";
import { useState } from "react";
import { useEffect, useRef } from "react";

//todo implement game polling to keep player active status up to date
function useGamePolling() {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function poll() {
      fetch("/api/game-state")
        .then(res => res.json())
        .then(data => {
          // update UI with game state
        });
      // Schedule next poll at the start of the next second
      const now = new Date();
      const msToNextSecond = 1000 - now.getMilliseconds();
      timerRef.current = setTimeout(poll, msToNextSecond);
    }
    poll();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}

export default function NameThatTool() {
  const [loading, setLoading] = useState(false);
  const [inRoom, setInRoom] = useState(false);
  const [role, setRole] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");

  async function startGame() {
    createRoom();
  }

  async function resumeGame() {
    setRole("host");
  }

  async function joinGame() {
    setRole("player");
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
    // params.append('userId', userId);//todo pass in user creds

    //todo check for error cases:
    // - room already has an active host
    // - player name already claimed by active player
    // - game already in progress and player name not recognized

    
    const data = await res.json();
    return data.success && data.data.active;
  }
  
  async function joinRoom(){
    setLoading(true);
    const roomValid = await isRoomValid();
    setLoading(false);
    if (roomValid){
      setInRoom(true);
    }else{
      //render errors (invalid room code, game in progress, name already claimed)
    }
  }

  let content;
  if (loading){
    content = (
      <div className="spinner-border" role="status">
        <span className="sr-only">Loading...</span>
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
              <input className="" id="roomCode" value={roomCode} onChange={e => setRoomCode(e.target.value)}></input>
            </div>
            <div className="col-sm-12 text-center">
              <button className="col-lg-2 col-md-4 col-sm-12 m-2 text-center btn btn-primary" onClick={joinRoom}>Join as Host</button>
              </div>
          </div>
        );
      }else{
        content = (
          <div className="row justify-content-center">
            <h1 className="col-sm-12 text-center m-2">Our Gracious Host</h1>
            <br></br>
            <h2 className="col-sm-12 text-center m-2"><label htmlFor="roomCode">Room Code:&nbsp;</label><span id="roomCode" className="text-danger">{roomCode}</span></h2>
            <br></br>
          </div>
        );
        //todo list players, start game button
      }
    }else if (role == "player"){
      if (!inRoom){
        content = (
          <div className="row justify-content-center">
            <div className="col-sm-12 m-2 text-center">
              <label className="m-2 text-center" htmlFor="playerName">Your Name:</label>
              <input className="" id="playerName" value={playerName} onChange={e => setPlayerName(e.target.value)}></input>
            </div>          
            <div className="col-sm-12 m-2 text-center">
              <label className="m-2 text-center" htmlFor="roomCode">Enter Room Code:</label>
              <input className="" id="roomCode" value={roomCode} onChange={e => setRoomCode(e.target.value)}></input>
            </div>
            <div className="col-sm-12 text-center">
              <button className="col-lg-2 col-md-4 col-sm-12 m-2 text-center btn btn-primary" onClick={joinRoom}>Join as Player</button>
              </div>
          </div>
        );
      }else{
        content = (
          <div className="row justify-content-center">
            <h1 className="col-sm-12 text-center m-2">{playerName}</h1>
            <br></br>
            <h2 className="col-sm-12 text-center m-2"><label htmlFor="roomCode">Room Code:&nbsp;</label><span id="roomCode" className="text-danger">{roomCode}</span></h2>
            <br></br>
          </div>
        );
      }
    }else{
      content = (
        <div className="row justify-content-center">
          <button className="col-lg-2 col-md-4 col-sm-12 btn btn-primary m-2 border" onClick={startGame}>Host Game</button>
          <button className="col-lg-2 col-md-4 col-sm-12 btn btn-secondary m-2 border" onClick={resumeGame}>Resume Hosting Game</button>
          <button className="col-lg-2 col-md-4 col-sm-12 btn btn-success m-2 border" onClick={joinGame}>Join Game</button>
        </div>
      );
    }
  }


  return (
    <>
      <div className="row justify-content-center m-2">
          <img src="/images/splash.png" alt="Name That Tool Splash" className="img-fuild" style={{ maxWidth: "816px", width: "100%", height: "auto" }}></img>
      </div>
      {content}      
    </>
  );
}
