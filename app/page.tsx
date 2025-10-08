"use client";
import { Content } from "next/font/google";
import { useState } from "react";

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
    const params = new URLSearchParams();
    params.append('code', roomCode);
    // params.append('userId', userId);//todo pass in user creds

    //todo check for error cases:
    // - room already has an active host
    // - player name already claimed by active player
    // - game already in progress and player name not recognized

    const res = await fetch(`/api/rooms?${params.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    return data.success && data.data.length == 1 && data.data[0].active;
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
  }
  if (role == "host"){
    if (!inRoom){
      content = (
        <div className="row justify-content-center">
          <h1 className="col-sm-12 text-center">Our Gracious Host</h1>
          <br></br>
          <label htmlFor="roomCode">Enter Room Code:</label>
          <br></br>
          <input id="roomCode" value={roomCode} onChange={e => setRoomCode(e.target.value)}></input>
          <br></br>
          <button onClick={joinRoom}>Join</button>
        </div>
      );
    }else{
      content = (
        <div className="row justify-content-center">
          <h1 className="col-sm-12 text-center">Our Gracious Host</h1>
          <br></br>
          <h2 className="col-sm-12 text-center"><label htmlFor="roomCode">Room Code:&nbsp;</label><span id="roomCode" className="text-danger">{roomCode}</span></h2>
          <br></br>
        </div>
      );
      //todo list players, start game button
    }
  }else if (role == "player"){
    if (!inRoom){
      content = (
        <>
          <label htmlFor="playerName">Your Name:</label>
          <br></br>
          <input id="playerName" value={playerName} onChange={e => setPlayerName(e.target.value)}></input>
          <hr></hr>
          <label htmlFor="roomCode">Enter Room Code:&nbsp;</label>
          <br></br>
          <input id="roomCode" value={roomCode} onChange={e => setRoomCode(e.target.value)}></input>
          <hr></hr>
          <button onClick={joinRoom}>Join</button>
        </>
      );
    }else{
      content = (
        <>
          <span>{playerName}</span>
          <br></br>
          <label htmlFor="roomCode">Room Code:&nbsp;</label><span id="roomCode">{roomCode}</span>
        </>
      );
    }
  }else{
    content = (
      <div className="row justify-content-center">
        <button className="col-lg-2 col-md-4 col-sm-12 btn btn-primary m-2 border" onClick={startGame}>Start Game</button>
        <button className="col-lg-2 col-md-4 col-sm-12 btn btn-secondary m-2 border" onClick={resumeGame}>Resume Game</button>
        <button className="col-lg-2 col-md-4 col-sm-12 btn btn-success m-2 border" onClick={joinGame}>Join Game</button>
      </div>
    );
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
