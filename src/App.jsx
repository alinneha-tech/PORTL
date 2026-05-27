
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion } from "framer-motion";
import { Trophy, RotateCcw } from "lucide-react";
import "./style.css";

const phases = [
  { ratio: 1, pointGoal: 5 },
  { ratio: 2, pointGoal: 10 },
  { ratio: 5, pointGoal: 13 },
  { ratio: 20, pointGoal: Infinity },
];

const SUCCESS_SOUND =
  "data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YTAAAAAA/////wAAAP///wAAAP///wAAAP///wAA";

function App() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [points, setPoints] = useState(0);
  const [responsesTowardPoint, setResponsesTowardPoint] = useState(0);
  const [responsesCompleted, setResponsesCompleted] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showFeelingPrompt, setShowFeelingPrompt] = useState(false);
  const [feelingResponse, setFeelingResponse] = useState("");
  const [feelingLog, setFeelingLog] = useState([]);

  const intervalRef = useRef(null);
  const audioRef = useRef(null);

  const phase = phases[phaseIndex];

  useEffect(() => {
    audioRef.current = new Audio(SUCCESS_SOUND);
    return () => clearInterval(intervalRef.current);
  }, []);

  const playSound = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  };

  const completeResponse = () => {
    const nextToward = responsesTowardPoint + 1;
    const nextCompleted = responsesCompleted + 1;

    setResponsesCompleted(nextCompleted);

    if (nextToward >= phase.ratio) {
      const nextPoints = points + 1;
      setPoints(nextPoints);
      setResponsesTowardPoint(0);
      playSound();

      if (
        nextPoints === phase.pointGoal &&
        phaseIndex < phases.length - 1
      ) {
        setShowCelebration(true);

        setTimeout(() => {
          setShowCelebration(false);
          setShowFeelingPrompt(true);
        }, 3000);
      }
    } else {
      setResponsesTowardPoint(nextToward);
    }
  };

  const startHolding = (e) => {
    e.preventDefault();

    if (
      intervalRef.current ||
      showCelebration ||
      showFeelingPrompt
    ) return;

    setHoldProgress(0);

    intervalRef.current = setInterval(() => {
      setHoldProgress((prev) => {
        const next = prev + 4;

        if (next >= 100) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          completeResponse();
          return 0;
        }

        return next;
      });
    }, 60);
  };

  const stopHolding = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setHoldProgress(0);
  };

  const continueTask = () => {
    setFeelingLog([
      ...feelingLog,
      feelingResponse || "No response entered"
    ]);

    setFeelingResponse("");
    setShowFeelingPrompt(false);
    setPhaseIndex(Math.min(phaseIndex + 1, phases.length - 1));
  };

  const reset = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;

    setPhaseIndex(0);
    setPoints(0);
    setResponsesTowardPoint(0);
    setResponsesCompleted(0);
    setHoldProgress(0);
    setShowCelebration(false);
    setShowFeelingPrompt(false);
    setFeelingResponse("");
    setFeelingLog([]);
  };

  return (
    <main className="page">
      <div className="card">

        <div className="topBar">
          <button className="resetButton" onClick={reset}>
            <RotateCcw size={16} />
            Reset
          </button>
        </div>

        <p className="eyebrow">Point Task</p>

        <h1>Earn Points</h1>

        <p className="subtitle">
          Press and hold to earn as many points as you can.
        </p>

        <motion.div
          key={points}
          initial={{ scale: 0.8 }}
          animate={{ scale: [1.1, 1] }}
          className="pointsBox"
        >
          <div className="pointsLabel">Points</div>
          <div className="pointsValue">{points}</div>
        </motion.div>

        {showCelebration ? (
          <motion.div
            className="celebrationBox"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Trophy size={90} className="trophy" />
            <h2>Congratulations!</h2>
            <p>You earned enough points to keep going.</p>
          </motion.div>
        ) : showFeelingPrompt ? (
          <div className="promptBox">
            <h2>How do you feel?</h2>

            <input
              value={feelingResponse}
              onChange={(e) => setFeelingResponse(e.target.value)}
              placeholder="Type your response here..."
            />

            <button className="continueButton" onClick={continueTask}>
              Continue
            </button>
          </div>
        ) : (
          <>
            <div className="progressTrack">
              <motion.div
                className="progressFill"
                animate={{ width: `${holdProgress}%` }}
              />
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              className="holdButton"
              onMouseDown={startHolding}
              onMouseUp={stopHolding}
              onMouseLeave={stopHolding}
              onTouchStart={startHolding}
              onTouchEnd={stopHolding}
            >
              Press & Hold
            </motion.button>
          </>
        )}

        <div className="responseBox">
          <div>Total responses completed</div>
          <strong>{responsesCompleted}</strong>
        </div>

        {feelingLog.length > 0 && (
          <div className="logBox">
            <h3>Feeling Responses</h3>

            {feelingLog.map((entry, i) => (
              <div key={i} className="logEntry">
                “{entry}”
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
