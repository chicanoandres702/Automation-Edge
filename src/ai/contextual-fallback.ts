/**
 * Client-side fallback for contextualSurveyAwareness when server actions are unavailable.
 * Uses simple heuristics on serialized page state to produce an actionable response.
 */
export async function contextualSurveyAwareness(input: any) {
  const surveyContent = (input?.surveyContent || "").toString().toLowerCase();
  let action = 'NAVIGATE';
  let parameters: any = {};
  let reasoning = 'Local heuristic reasoning.';
  let confidence = 0.5;
  let isGoalAchieved = false;
  let successPatternIdentified: string | undefined;

  if (/submitted|thank you|success|uploaded|completed/.test(surveyContent)) {
    action = 'wait';
    confidence = 1.0;
    isGoalAchieved = true;
    successPatternIdentified = 'Success banner detected';
    reasoning = 'Detected success indicators in environment snapshot.';
  } else if (/login|sign in|sign-in|please sign in/.test(surveyContent)) {
    action = 'NAVIGATE';
    parameters = { value: '/' }; // Use root as safe baseline if lost
    reasoning = 'Login prompt detected; returning to root or looking for login link.';
    confidence = 0.4;
  } else if (/submit|apply|next|continue|save/.test(surveyContent)) {
    action = 'click';
    parameters = { selector: 'button, input[type="submit"], a' };
    reasoning = 'Primary action CTA likely present; attempting click.';
    confidence = 0.6;
  } else {
    action = 'scroll';
    parameters = {};
    reasoning = 'No clear action detected; scrolling to reveal UI.';
    confidence = 0.25;
  }

  return {
    action,
    parameters,
    reasoning,
    confidence,
    isGoalAchieved,
    successPatternIdentified,
  };
}
