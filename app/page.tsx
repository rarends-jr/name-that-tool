"use client";
import { useState } from "react";
import { useEffect, useRef } from "react";

export default function NameThatTool() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [inRoom, setInRoom] = useState(false);
  const [role, setRole] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [gameState, setGameState] = useState(null);
  const [currentAnswer, setCurrentAnswer] = useState("");

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
    
    const data = await res.json();
    if (!data.success){
      setError(data.error);
    }else{
      setError("");
    }
    return data.success;
  }

  async function fetchGameState(){
    const params = new URLSearchParams();
    params.append('code', roomCode);
    params.append('role', role);
    params.append('playerName', playerName);
    let res = await fetch(`/api/rooms/status?${params.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    const data = await res.json();
    if (!data.success){
      setError(data.error);
    }else{
      setError("");
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
              <input className="" id="roomCode" value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())}></input>
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

  useEffect(() => {
    fetchGameState(); // Initial fetch when component mounts

    const intervalId = setInterval(fetchGameState, 100); // Poll every 100ms

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [roomCode, role, playerName]); // Re-run effect if gameId changes


  return (
    <>
      <div className="row justify-content-center m-2">
          <img src="/images/splash.png" alt="Name That Tool Splash" className="img-fuild" style={{ maxWidth: "816px", width: "100%", height: "auto" }}></img>
      </div>
      <div className="row justify-content-center m-2">
        <h2 className="col-sm-12 text-center text-danger">{error}</h2>
      </div>
      {content}      
    </>
  );
}
