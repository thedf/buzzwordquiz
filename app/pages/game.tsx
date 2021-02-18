/** @jsx jsx */
import { jsx, css } from '@emotion/react';
import { ReactElement, useEffect, useState } from 'react';
import styled from '@emotion/styled';
import rem from '../macros/rem.macro';
import PrimaryButton from '../components/buttons/PrimaryButton';
import {
  typoCallout,
  typoFootnote,
  typoMega3,
  typoTitle3,
} from '../styles/typography';
import SecondaryButton from '../components/buttons/SecondaryButton';
import RadialProgress from '../components/RadialProgress';
import colors, { ColorName } from '../styles/colors';
import TertiaryButton from '../components/buttons/TertiaryButton';
import PageContainer from '../components/PageContainer';
import TextField from '../components/fields/TextField';
import BigEmoji from '../components/BigEmoji';
import useGameSession, { UnansweredQuestion } from '../hooks/useGameSession';
import useTimer from '../hooks/useTimer';
import useSound from 'use-sound';

const Main = styled(PageContainer)`
  padding: ${rem(40)} ${rem(20)};
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${rem(32)};
`;

const Score = styled.h2`
  margin: 0;
  ${typoTitle3}
`;

const ImageContainer = styled.div`
  position: relative;
  display: flex;
  width: 30vh;
  max-width: ${rem(256)};
  align-items: center;
  justify-content: center;
  align-self: center;
  overflow: hidden;
  margin-bottom: ${rem(32)};
  border-radius: ${rem(16)};
  background: var(--theme-label-primary);
  box-shadow: var(--theme-shadow2);

  img {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &:before {
    content: '';
    padding-top: 100%;
  }
`;

const Letters = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  margin: ${rem(-4)} ${rem(-2)};
  align-self: center;
  font-weight: bold;
  ${typoFootnote}

  > * {
    width: ${rem(32)};
    height: ${rem(32)};
    margin: ${rem(4)} ${rem(2)};
    box-sizing: border-box;
  }
`;

const EmptyLetter = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${rem(8)};
  background: var(--theme-background-secondary);
  border: ${rem(1)} solid var(--theme-divider-tertiary);
`;

const WrapBreak = styled.span`
  flex-basis: 100%;
  width: unset;
  height: 0;
`;

const Options = styled(Letters)`
  margin-top: auto;

  > * {
    width: ${rem(40)};
    height: ${rem(40)};
  }
`;

const CompletedScore = styled.h2`
  margin: ${rem(16)} 0 ${rem(48)};
  text-align: center;
  ${typoMega3}
`;

const CompletedText = styled.div`
  margin: ${rem(32)} ${rem(12)} ${rem(8)};
  color: var(--theme-label-quaternary);
  ${typoFootnote}
`;

const completed = false;

const progressColors: ColorName[] = ['avocado', 'cheese', 'ketchup'];

function updateArrayItem<T>(array: T[], index: number, item: T): T[] {
  return [...array.slice(0, index), item, ...array.slice(index + 1)];
}

export default function Game(): ReactElement {
  const [question, setQuestion] = useState<UnansweredQuestion>(null);
  const [optionsState, setOptionsState] = useState<
    { selected: boolean; letter: string }[]
  >(null);
  const [answerLetters, setAnswerLetters] = useState<string[]>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [playSuccess] = useSound('/success.mp3');
  const [playFail] = useSound('/fail.mp3');

  const [playClock, { stop: stopClock }] = useSound('/clock.mp3', {
    loop: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  const { session, startSession, sendAnswer, skipQuestion } = useGameSession();
  const { millisecondsLeft, quantizedProgress, lastTenSeconds } = useTimer(
    session?.duration * 1000,
    isLoading,
    3,
    () => {
      stopClock();
      console.log('timeout');
    },
  );

  useEffect(() => {
    startSession().then(({ session }) => {
      setQuestion(session.nextQuestion);
    });
  }, []);

  useEffect(() => {
    if (question) {
      setOptionsState(
        question.letters.map((option) => ({ selected: false, letter: option })),
      );
      setAnswerLetters(
        question.words.flatMap((word, index) => {
          const base: string[] = new Array(word).fill(null);
          if (index < question.words.length - 1) {
            return [...base, 'space'];
          }
          return base;
        }),
      );
    }
  }, [question]);

  useEffect(() => {
    if (lastTenSeconds) {
      playClock();
    }
  }, [lastTenSeconds]);

  const submitAnswer = async (answer: string): Promise<void> => {
    setIsLoading(true);
    const res = await sendAnswer(answer);
    if (res.correct) {
      playSuccess();
      setQuestion(res.session.nextQuestion);
    } else {
      playFail();
      setIsLoading(false);
    }
  };

  const onOptionClick = (index: number): void => {
    const availableSpot = answerLetters.findIndex((letter) => !letter);
    if (availableSpot > -1) {
      const newAnswerLetters = updateArrayItem(
        answerLetters,
        availableSpot,
        optionsState[index].letter,
      );
      setAnswerLetters(newAnswerLetters);
      setOptionsState(
        updateArrayItem(optionsState, index, {
          ...optionsState[index],
          selected: true,
        }),
      );
      if (availableSpot === answerLetters.length - 1) {
        submitAnswer(
          newAnswerLetters
            .map((letter) => (letter === 'space' ? ' ' : letter))
            .join(''),
        );
      }
    }
  };

  const onAnswerClick = (index: number): void => {
    const optionIndex = optionsState.findIndex(
      (option) => option.selected && option.letter === answerLetters[index],
    );
    if (optionIndex > -1) {
      setAnswerLetters(updateArrayItem(answerLetters, index, null));
      setOptionsState(
        updateArrayItem(optionsState, optionIndex, {
          ...optionsState[optionIndex],
          selected: false,
        }),
      );
    }
  };

  const skip = async () => {
    setIsLoading(true);
    const res = await skipQuestion();
    setQuestion(res.session.nextQuestion);
  };

  if (!question || !session) {
    return <></>;
  }

  return (
    <Main>
      {completed ? (
        <>
          <BigEmoji>🎉</BigEmoji>
          <CompletedScore>Your score: {session.score}</CompletedScore>
          <CompletedText>
            Fill in your nickname to enter our hall of fame
          </CompletedText>
          <TextField inputId="nickname" label="Nickname" />
          <PrimaryButton
            css={css`
              margin-top: ${rem(32)};
              align-self: center;
            `}
          >
            For fame and glory 🎖
          </PrimaryButton>
        </>
      ) : (
        <>
          <Header>
            <Score>Score: {session.score}</Score>
            <RadialProgress
              steps={session.duration * 1000}
              progress={millisecondsLeft}
              css={css`
                position: relative;
                --radial-progress-step: var(--theme-background-secondary);
                --radial-progress-completed-step: ${colors[
                  progressColors[quantizedProgress]
                ]['50']};
              `}
            >
              <span
                css={css`
                  display: flex;
                  position: absolute;
                  left: 0;
                  right: 0;
                  top: 0;
                  bottom: 0;
                  align-items: center;
                  justify-content: center;
                  font-weight: bold;
                  ${typoCallout}
                `}
              >
                {(millisecondsLeft / 1000).toFixed()}
              </span>
            </RadialProgress>
          </Header>
          <ImageContainer>
            <img
              src={question.logo}
              alt="Logo"
              onLoad={() => setIsLoading(false)}
            />
          </ImageContainer>
          <Letters>
            {answerLetters?.map((letter, index) =>
              !letter ? (
                <EmptyLetter key={index} />
              ) : letter === 'space' ? (
                <WrapBreak key={index} />
              ) : (
                <SecondaryButton
                  buttonSize="small"
                  key={index}
                  onClick={() => onAnswerClick(index)}
                >
                  {letter}
                </SecondaryButton>
              ),
            )}
          </Letters>
          <Options>
            {optionsState?.map((option, index) => (
              <PrimaryButton
                key={index}
                disabled={option.selected}
                onClick={() => onOptionClick(index)}
              >
                {option.letter}
              </PrimaryButton>
            ))}
          </Options>
          <TertiaryButton
            css={css`
              margin-top: ${rem(40)};
            `}
            onClick={skip}
            disabled={session.skips >= session.maxSkips}
          >
            Skip ({session.skips}/{session.maxSkips})
          </TertiaryButton>
        </>
      )}
    </Main>
  );
}
