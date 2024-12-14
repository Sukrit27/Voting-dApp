import { useState, useEffect } from 'react';
import { ethers } from "ethers";
import { contractAbi, contractAddress } from "./Constant/constant.js";
import Login from './components/Login.jsx';
import Finished from './components/Finished.jsx';
import Connected from './components/Connected.jsx';
import './App.css';

function App() {
  const [provider, setProvider] = useState(null);
  const [account, setAccount] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [votingStatus, setVotingStatus] = useState(true);
  const [remainingTime, setRemainingTime] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [number, setNumber] = useState('');
  const [canVote, setCanVote] = useState(true);

  const { ethereum } = window;

  useEffect(() => {
    if (!ethereum) {
      console.error("MetaMask or Ethereum provider not detected");
      return;
    }

    getCandidates();
    getRemainingTime();
    getCurrentStatus();

    ethereum.on('accountsChanged', handleAccountsChanged);

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, [ethereum]);

  async function vote() {
    if (!ethereum) return;

    const provider = new ethers.BrowserProvider(ethereum);
    const signer = await provider.getSigner();
    const contractInstance = new ethers.Contract(contractAddress, contractAbi, signer);

    const tx = await contractInstance.vote(number);
    await tx.wait();
    checkCanVote();
  }

  async function checkCanVote() {
    if (!ethereum) return;

    const provider = new ethers.BrowserProvider(ethereum);
    const signer = await provider.getSigner();
    const contractInstance = new ethers.Contract(contractAddress, contractAbi, signer);

    const voteStatus = await contractInstance.voters(await signer.getAddress());
    setCanVote(voteStatus);
  }

  async function getCandidates() {
    try {
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const contractInstance = new ethers.Contract(contractAddress, contractAbi, signer);
  
      const candidatesList = await contractInstance.getAllVotesOfCandiates();
      console.log("Candidates List:", candidatesList);
  
      // Handle empty list
      if (!candidatesList || candidatesList.length === 0) {
        setCandidates([]);
        return;
      }
  
      const formattedCandidates = candidatesList.map((candidate, index) => {
        // Use appropriate conversion for voteCount
        return {
          index: index,
          name: candidate.name || "Unknown",
          voteCount: candidate.voteCount.toNumber ? candidate.voteCount.toNumber() : parseInt(candidate.voteCount, 10) || 0,
        };
      });
  
      setCandidates(formattedCandidates);
    } catch (error) {
      console.error("Error getting candidates:", error);
      setCandidates([]); // Ensure UI doesn't break
    }
  }
  

  async function getCurrentStatus() {
    if (!ethereum) return;

    const provider = new ethers.BrowserProvider(ethereum);
    const signer = await provider.getSigner();
    const contractInstance = new ethers.Contract(contractAddress, contractAbi, signer);

    const status = await contractInstance.getVotingStatus();
    setVotingStatus(status);
  }

  async function getRemainingTime() {
    if (!ethereum) return;

    const provider = new ethers.BrowserProvider(ethereum);
    const signer = await provider.getSigner();
    const contractInstance = new ethers.Contract(contractAddress, contractAbi, signer);

    const time = await contractInstance.getRemainingTime();
    setRemainingTime(parseInt(time, 16));
  }

  function handleAccountsChanged(accounts) {
    if (accounts.length > 0 && account !== accounts[0]) {
      setAccount(accounts[0]);
      checkCanVote();
    } else {
      setIsConnected(false);
      setAccount(null);
    }
  }

  async function connectToMetamask() {
    if (!ethereum) {
      console.error("MetaMask is not detected in the browser");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(ethereum);
      setProvider(provider);

      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setAccount(address);
      console.log("Metamask Connected: " + address);

      setIsConnected(true);
      checkCanVote();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleNumberChange(e) {
    setNumber(e.target.value);
  }

  return (
    <div className="App">
      {votingStatus ? (
        isConnected ? (
          <Connected
            account={account}
            candidates={candidates}
            remainingTime={remainingTime}
            number={number}
            handleNumberChange={handleNumberChange}
            voteFunction={vote}
            showButton={canVote}
          />
        ) : (
          <Login connectWallet={connectToMetamask} />
        )
      ) : (
        <Finished />
      )}
    </div>
  );
}

export default App;
