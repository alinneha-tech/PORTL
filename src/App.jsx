import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import "./style.css";

const HOLD_INCREMENT = 4;
const HOLD_INTERVAL_MS = 60;

const SUCCESS_SOUND =
  "data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YTAAAAAA/////wAAAP///wAAAP///wAAAP///wAA";

// Hidden schedule progression. Do not display these values to participants.
const phases = [
  { ratio: 1, pointGoal: 5 },
  { ratio: 2, pointGoal: 10 },
  { ratio: 5, pointGoal: 13 },
  { ratio: 20, pointGoal: Infinity },
];

function shouldEarnPoint(responsesTowardPoint, ratio) {
  return responsesTowardPoint + 1 >= ratio;
}

function shouldAskFeeling(points, pointGoal, phaseIndex) {
  return points === pointGoal && phaseIndex < phases.length - 1;
}

function runSelfTests() {
  console.assert(shouldEarnPoint(0, 1) === true, "FR1 should reinforce each completed response.");
  console.assert(shouldEarnPoint(0, 2) === false, "FR2 should not reinforce after one completed response.");
  console.assert(shouldEarnPoint(1, 2) === true, "FR2 should reinforce after two completed responses.");
  console.assert(shouldEarnPoint(4, 5) === true, "FR5 should reinforce after five completed responses.");
  console.assert(shouldEarnPoint(19, 20) === true, "FR20 should reinforce after twenty completed responses.");
  console.assert(shouldAskFeeling(5, 5, 0) === true, "Prompt should appear after 5 points.");
  console.assert(shouldAskFeeling(10, 10, 1) === true, "Prompt should appear after 10 points.");
  console.assert(shouldAskFeeling(13, 13, 2) === true, "Prompt should appear after 13 points.");
  console.assert(shouldAskFeeling(14, 13, 2) === false, "Prompt should only appear at the transition point.");
  console.assert(shouldAskFeeling(30, Infinity, 3) === false, "Final phase should not prompt for another schedule change.");
}

function App() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [points, setPoints] = useState(0);
  const [responsesCompleted, setResponsesCompleted] = useState(0);
  const [responsesTowardPoint, setResponsesTowardPoint] = useState(0);
  const [showFeelingPrompt, setShowFeelingPrompt] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [feelingResponse, setFeelingResponse] = useState("");
  const [feelingLog, setFeelingLog] = useState([]);

  const holdInterval = useRef(null);
  const audioRef = useRef(null);
  const phase = phases[phaseIndex];

  useEffect(() => {
    audioRef.current = new Audio(SUCCESS_SOUND);
    runSelfTests();
    return () => clearInterval(holdInterval.current);
  }, []);

  const playSuccessSound = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  };

  const completeResponse = () => {
    if (showFeelingPrompt) return;

    const nextResponsesCompleted = responsesCompleted + 1;
    const nextResponsesTowardPoint = responsesTowardPoint + 1;

    setResponsesCompleted(nextResponsesCompleted);

    if (shouldEarnPoint(responsesTowardPoint, phase.ratio)) {
      const nextPoints = points + 1;
      setPoints(nextPoints);
      setResponsesTowardPoint(0);
      playSuccessSound();

      if (shouldAskFeeling(nextPoints, phase.pointGoal, phaseIndex)) {
        setTimeout(() => setShowFeelingPrompt(true), 700);
      }
    } else {
      setResponsesTowardPoint(nextResponsesTowardPoint);
    }
  };

  const startHolding = (event) => {
    event.preventDefault();
    if (showFeelingPrompt || holdInterval.current) return;

    setHoldProgress(0);
    holdInterval.current = setInterval(() => {
      setHoldProgress((previousProgress) => {
        const nextProgress = previousProgress + HOLD_INCREMENT;
        if (nextProgress >= 100) {
          clearInterval(holdInterval.current);
          holdInterval.current = null;
          completeResponse();
          return 0;
        }
        return nextProgress;
      });
    }, HOLD_INTERVAL_MS);
  };

  const stopHolding = () => {
    clearInterval(holdInterval.current);
    holdInterval.current = null;
    setHoldProgress(0);
  };

  const continueToNextSchedule = () => {
    setFeelingLog((previousLog) => [
      ...previousLog,
      {
        points,
        responsesCompleted,
        feeling: feelingResponse.trim() || "No response entered",
      },
    ]);

    setPhaseIndex((currentIndex) => Math.min(currentIndex + 1, phases.length - 1));
    setResponsesTowardPoint(0);
    setFeelingResponse("");
    setShowFeelingPrompt(false);
  };

  const reset = () => {
    clearInterval(holdInterval.current);
    holdInterval.current = null;
    setPhaseIndex(0);
    setPoints(0);
    setResponsesCompleted(0);
    setResponsesTowardPoint(0);
    setShowFeelingPrompt(false);
    setHoldProgress(0);
    setFeelingResponse("");
    setFeelingLog([]);
  };

  return (
    <main className="page">
      <section className="card">
        <div className="topBar">
          <button className="resetButton" onClick={reset}>
            <RotateCcw size={16} />
            Reset
          </button>
        </div>

        <header>
          <p className="eyebrow">Point Task</p>
          <h1>Earn Points</h1>
          <p className="subtitle">Press and hold the button below.</p>
        </header>

        <motion.div
          key={points}
          initial={{ scale: 0.75, opacity: 0.4 }}
          animate={{ scale: [1.12, 1], opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="pointsBox"
        >
          <p>Points</p>
          <strong>{points}</strong>
        </motion.div>

        {!showFeelingPrompt ? (
          <div className="taskArea">
            <div className="progressTrack" aria-hidden="true">
              <motion.div
                className="progressFill"
                animate={{ width: `${holdProgress}%` }}
                transition={{ duration: 0.05 }}
              />
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onMouseDown={startHolding}
              onMouseUp={stopHolding}
              onMouseLeave={stopHolding}
              onTouchStart={startHolding}
              onTouchEnd={stopHolding}
              className="holdButton"
            >
              Press & Hold
            </motion.button>
          </div>
        ) : (
          <div className="promptBox">
            <h2>How do you feel?</h2>
            <input
              value={feelingResponse}
              onChange={(event) => setFeelingResponse(event.target.value)}
              placeholder="Type your response here..."
              autoFocus
            />
            <button className="continueButton" onClick={continueToNextSchedule}>
              Continue
            </button>
          </div>
        )}

        <div className="responseBox">
          <p>Total responses completed</p>
          <strong>{responsesCompleted}</strong>
        </div>

        {feelingLog.length > 0 && (
          <section className="logBox">
            <h3>Feeling Responses</h3>
            {feelingLog.map((entry, index) => (
              <div key={index} className="logEntry">
                <p className="logTitle">Prompt {index + 1}</p>
                <p className="logText">“{entry.feeling}”</p>
              </div>
            ))}
          </section>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
