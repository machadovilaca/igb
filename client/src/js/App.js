import React, { Component } from 'react';
import _ from 'lodash';
import socket from './socket';
import PeerConnection from './PeerConnection';
import MainWindow from './MainWindow';
import CallWindow from './CallWindow';
import CallModal from './CallModal';
import 'semantic-ui-css/semantic.min.css';
import logo from './logo.png';

class App extends Component {
  constructor() {
    super();
    this.state = {
      clientId: "",
      callWindow: "",
      callModal: "",
      callFrom: "",
      localSrc: null,
      peerSrc: null,
      code: "",
    };
    this.friendID = null;
    this.pc = {};
    this.config = null;
    this.startCallHandler = this.startCall.bind(this);
    this.endCallHandler = this.endCall.bind(this);
    this.rejectCallHandler = this.rejectCall.bind(this);
    this.writeFile = this.writeFile.bind(this);
    this.writeCanvas = this.writeCanvas.bind(this);
    this.audio = new Audio("https://media1.vocaroo.com/mp3/19uEcelROuXN");
    this.audio.loop = true;
    this.audio.load();
  }

  componentDidMount() {
    socket
      .on("init", ({ id: clientId }) => {
        document.title = `${clientId} - VideoCall`;
        this.setState({ clientId });
      })
      .on("request", ({ from: callFrom }) => {
        this.setState({ callModal: "active", callFrom });
        this.audio.play();
      })
      .on("call", (data) => {
        if (data.sdp) {
          this.pc.setRemoteDescription(data.sdp);
          if (data.sdp.type === "offer") this.pc.createAnswer();
        } else this.pc.addIceCandidate(data.candidate);
      })
      .on("end", this.endCall.bind(this, false))
      .emit("init");
  }

  startCall(isCaller, friendID, config) {
    this.friendID = friendID;
    this.config = config;
    this.pc = new PeerConnection(friendID)
      .on("localStream", (src) => {
        const newState = { callWindow: "active", localSrc: src };
        if (!isCaller) newState.callModal = "";
        this.setState(newState);
        this.audio.pause();
      })
      .on("peerStream", (src) => this.setState({ peerSrc: src }))
      .start(isCaller, config);
  }

  writeFile(data) {
    socket.emit("file", { to: this.friendID, data });
  }

  writeCanvas(data) {
    socket.emit("canvas", {to: this.friendID, data});
  }

  rejectCall() {
    const { callFrom } = this.state;
    socket.emit("end", { to: callFrom });
    this.setState({ callModal: "" });
    this.audio.pause();
  }

  endCall(isStarter) {
    if (_.isFunction(this.pc.stop)) {
      this.pc.stop(isStarter);
    }
    this.pc = {};
    this.config = null;
    this.setState({
      callWindow: "",
      callModal: "",
      localSrc: null,
      peerSrc: null,
    });
  }

  render() {
    const {
      clientId,
      callFrom,
      callModal,
      callWindow,
      localSrc,
      peerSrc,
    } = this.state;
    return (
      <div className="main-container">
        <img className="logo" src={logo} />
        {!_.isEmpty(this.config) ? (
          <CallWindow
            status={callWindow}
            localSrc={localSrc}
            peerSrc={peerSrc}
            config={this.config}
            mediaDevice={this.pc.mediaDevice}
            endCall={this.endCallHandler}
            writeFile={this.writeFile}
            writeCanvas={this.writeCanvas}
            socket={socket}
            clientId={clientId}
          />
        ) : (
          <>
            <MainWindow clientId={clientId} startCall={this.startCallHandler} />
            <CallModal
              status={callModal}
              startCall={this.startCallHandler}
              rejectCall={this.rejectCallHandler}
              callFrom={callFrom}
            />
          </>
        )}
      </div>
    );
  }
}

export default App;
