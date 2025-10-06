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
    const res = await fetch("/api/room/create", {
      method: "POST"
    });
    const data = await res.json();

    setRoomCode(data.roomCode);
  }

  async function isRoomValid(){
    return false;
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
          <span>Your Name:</span>
          <br></br>
          <input value={playerName} onChange={e => setPlayerName(e.target.value)}></input>
          <span>Enter Room Code:</span>
          <br></br>
          <input value={roomCode} onChange={e => setRoomCode(e.target.value)}></input>
          <br></br>
          <button onClick={joinRoom}>Join</button>
        </>
      );
    }else{
      content = (
        <>
          <span>{playerName}</span>
          <br></br>
          <span>{roomCode}</span>
        </>
      );
    }
  }else if (role == "player"){
    if (!inRoom){
      content = (
        <>
          <span>Your Name:</span>
          <br></br>
          <input value={playerName} onChange={e => setPlayerName(e.target.value)}></input>
          <span>Enter Room Code:</span>
          <br></br>
          <input value={roomCode} onChange={e => setRoomCode(e.target.value)}></input>
          <br></br>
          <button onClick={joinRoom}>Join</button>
        </>
      );
    }else{
      content = (
        <>
          <span>{playerName}</span>
          <br></br>
          <span>{roomCode}</span>
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
      {Content}      
    </>
  );
}
