"use client";
import { Content } from "next/font/google";
import { useState } from "react";

export default function NameThatTool() {
  const [inRoom, setInRoom] = useState(false);
  const [role, setRole] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");

  async function startGame() {
    setRole("host");
    createRoom();
  }

  async function resumeGame() {
    setRole("host");
  }

  async function joinGame() {
    setRole("player");
  }

  async function createRoom(){
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
    const roomValid = await isRoomValid();
    if (roomValid){
      setInRoom(true);
    }else{
      //render errors (invalid room code, game in progress, name already claimed)
    }
  }

  let content;
  if (role == "host"){
    if (!inRoom){
      content = (
        <>
          <span>Our Gracious Host</span>
          <br></br>
          <label htmlFor="roomCode">Enter Room Code:</label>
          <br></br>
          <input id="roomCode" value={roomCode} onChange={e => setRoomCode(e.target.value)}></input>
          <br></br>
          <button onClick={joinRoom}>Join</button>
        </>
      );
    }else{
      content = (
        <>
          <span>Our Gracious Host</span>
          <br></br>
          <label htmlFor="roomCode">Room Code:&nbsp;</label><span id="roomCode">{roomCode}</span>
          <br></br>
        </>
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
      <div className="flex">
        <button className="flex-1 btn-primary" onClick={startGame}>Start Game</button>
        <button className="flex-1 btn-primary" onClick={resumeGame}>Resume Game</button>
        <button className="flex-1 btn-primary" onClick={joinGame}>Join Game</button>
      </div>
    );
  }

  return (
    <>
      <div className="flex">
        <span className="flex-1 text-3xl/10 font-medium mb-2 text-center">Name That Tool!</span>
      </div>
      {content}      
    </>
  );
}
