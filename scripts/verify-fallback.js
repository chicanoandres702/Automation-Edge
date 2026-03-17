import { generateAutomationFromPrompt } from './src/ai/client-fallback.js';

async function test() {
    console.log("Testing 'homework' prompt...");
    const homework = await generateAutomationFromPrompt({ prompt: "Finish my homework for SWK-2400" });
    console.log(JSON.stringify(homework, null, 2));

    console.log("\nTesting 'login' prompt...");
    const login = await generateAutomationFromPrompt({ prompt: "Login to dashboard" });
    console.log(JSON.stringify(login, null, 2));

    console.log("\nTesting generic prompt...");
    const generic = await generateAutomationFromPrompt({ prompt: "Just browse around" });
    console.log(JSON.stringify(generic, null, 2));
}

test();
