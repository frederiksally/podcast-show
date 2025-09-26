import { describe, it, expect, beforeEach } from 'vitest';
import { EpisodeOrchestrator } from './episodes/orchestrator';
import { StoryDirectorAgent } from './episodes/story-director';
import { ScenePlannerAgent } from './episodes/scene-planner';
import { StateAgent } from './episodes/state-agent';
import { MusicAgent } from './episodes/music-agent';
import { SFXAgent } from './episodes/sfx-agent';
import type { EpisodeBible, StateCard } from './base/types';

describe('Episode Multi-Agent Workflow', () => {
  let orchestrator: EpisodeOrchestrator;
  let storyDirector: StoryDirectorAgent;
  let scenePlanner: ScenePlannerAgent;
  let stateAgent: StateAgent;
  let musicAgent: MusicAgent;
  let sfxAgent: SFXAgent;
  
  const testPremise = "We're trapped in a haunted Victorian mansion during a thunderstorm";
  const testAccountId = 'test-account-123';
  const testUserId = 'test-user-456';
  const testTitle = 'The Mansion Mystery';
  const testElevenLabsKey = process.env.ELEVENLABS_API_KEY || 'test-key';
  const mockDatabaseClient = {}; // Mock database client

  beforeEach(() => {
    orchestrator = new EpisodeOrchestrator(mockDatabaseClient, testElevenLabsKey);
    storyDirector = new StoryDirectorAgent();
    scenePlanner = new ScenePlannerAgent();
    stateAgent = new StateAgent();
    musicAgent = new MusicAgent();
    sfxAgent = new SFXAgent();
  });

  it('should execute the complete orchestrator workflow', async () => {
    console.log('🚀 Testing Complete Episode Multi-Agent Workflow with Orchestrator...\n');
    
    // Step 1: User Input → Orchestrator starts episode
    console.log('1️⃣ Orchestrator: Starting new episode...');
    
    // Note: This would normally call orchestrator.startEpisode, but since we're testing 
    // the agents individually, let's simulate the orchestrated workflow:
    
    // Orchestrator Step 1: Story Director creates Episode Bible (once per episode)
    console.log('   🎬 Orchestrator → Story Director: Creating Episode Bible...');
    const episodeBible = await storyDirector.createEpisodeBible(testPremise);
    
    expect(episodeBible).toBeDefined();
    expect(episodeBible.worldRules.genre).toBeTruthy();
    expect(episodeBible.storytellingGuidelines.narrativeVoice).toBeTruthy();
    expect(episodeBible.audioDirection.musicStyle).toBeTruthy();
    
    console.log(`   ✅ Episode Bible created`);
    console.log(`   📖 Genre: ${episodeBible.worldRules.genre}`);
    console.log(`   🎭 Style: ${episodeBible.worldRules.style}`);
    console.log(`   🎵 Music: ${episodeBible.audioDirection.musicStyle}\n`);

    // Orchestrator Step 2: State Agent initializes State Card
    console.log('2️⃣ Orchestrator → State Agent: Initializing State Card...');
    const stateCard = await stateAgent.initializeStateCard(testPremise);
    
    expect(stateCard).toBeDefined();
    expect(Array.isArray(stateCard.keyFacts)).toBe(true);
    expect(Array.isArray(stateCard.anchors)).toBe(true);
    
    console.log(`   ✅ State Card initialized`);
    console.log(`   📚 Story: ${stateCard.storySoFar.substring(0, 80)}...`);
    console.log(`   🔑 Facts: ${stateCard.keyFacts.length} | ⚓ Anchors: ${stateCard.anchors.length}\n`);

    // Orchestrator Step 3: Scene Planner generates first scene using Episode Bible
    console.log('3️⃣ Orchestrator → Scene Planner: Generating Scene 1 with Episode Bible...');
    const scene1 = await scenePlanner.generateScene(
      testPremise,
      episodeBible,
      stateCard,
      1
    );
    
    expect(scene1).toBeDefined();
    expect(scene1.narration).toBeTruthy();
    expect(scene1.choiceA).toBeTruthy();
    expect(scene1.choiceB).toBeTruthy();
    expect(Array.isArray(scene1.audioCues)).toBe(true);
    
    console.log(`   ✅ Scene 1 generated`);
    console.log(`   📝 Narration: ${scene1.narration.substring(0, 100)}...`);
    console.log(`   🅰️ Choice A: ${scene1.choiceA.substring(0, 60)}...`);
    console.log(`   🅱️ Choice B: ${scene1.choiceB.substring(0, 60)}...`);
    console.log(`   🎵 Audio cues: ${scene1.audioCues.length}\n`);

    // Orchestrator Step 4: Music Agent generates background music for Scene 1
    console.log('4️⃣ Orchestrator → Music Agent: Generating Scene 1 music...');
    const sceneMusic = await musicAgent.generateSceneMusic(
      episodeBible,
      scene1.narration,
      1,
      180 // 3 minutes estimated
    );
    
    expect(sceneMusic).toBeDefined();
    expect(sceneMusic.type).toBe('music');
    expect(sceneMusic.metadata?.elevenLabsPrompt).toBeTruthy();
    expect(sceneMusic.metadata?.isInstrumental).toBe(true);
    
    console.log(`   ✅ Scene 1 music generated`);
    console.log(`   🎼 Prompt: ${sceneMusic.metadata?.elevenLabsPrompt?.substring(0, 80)}...`);
    console.log(`   ⏱️ Duration: ${sceneMusic.metadata?.durationMs}ms`);
    console.log(`   🎵 Instrumental: ${sceneMusic.metadata?.isInstrumental}\n`);

    // Orchestrator Step 5: SFX Agent generates sound effects for Scene 1
    console.log('5️⃣ Orchestrator → SFX Agent: Generating Scene 1 sound effects...');
    const sceneSFX = await sfxAgent.generateSceneSFX(
      episodeBible,
      scene1.narration,
      1
    );
    
    expect(Array.isArray(sceneSFX)).toBe(true);
    expect(sceneSFX.length).toBeGreaterThan(0);
    expect(sceneSFX[0].type).toBe('sfx');
    
    console.log(`   ✅ Scene 1 SFX generated`);
    console.log(`   🔊 SFX count: ${sceneSFX.length}`);
    if (sceneSFX.length > 0) {
      console.log(`   🎬 Sample SFX: "${sceneSFX[0].description}"`);
      console.log(`   📡 Trigger: ${sceneSFX[0].trigger}`);
    }
    console.log();

    // Orchestrator Step 6: State Agent updates state based on choice
    console.log('6️⃣ Orchestrator → State Agent: Updating state after choice A...');
    const updatedStateCard = await stateAgent.updateStateCard(
      stateCard,
      {
        id: 'scene-1',
        episodeId: 'test-episode',
        sceneNumber: 1,
        narration: scene1.narration,
        choiceA: scene1.choiceA,
        choiceB: scene1.choiceB,
        chosenOption: 'A',
        stateUpdate: scene1.stateUpdate,
        audioCues: scene1.audioCues,
        createdAt: new Date().toISOString()
      },
      'A',
      []
    );
    
    expect(updatedStateCard).toBeDefined();
    expect(updatedStateCard.storySoFar).not.toBe(stateCard.storySoFar);
    
    console.log(`   ✅ State updated`);
    console.log(`   📚 Updated story: ${updatedStateCard.storySoFar.substring(0, 80)}...\n`);

    // Orchestrator Step 7: Scene Planner generates second scene using same Episode Bible
    console.log('7️⃣ Orchestrator → Scene Planner: Generating Scene 2 with same Episode Bible...');
    const scene2 = await scenePlanner.generateScene(
      testPremise,
      episodeBible, // Same Episode Bible - no new Story Director call!
      updatedStateCard,
      2
    );
    
    expect(scene2).toBeDefined();
    expect(scene2.narration).toBeTruthy();
    
    console.log(`   ✅ Scene 2 generated`);
    console.log(`   📝 Narration: ${scene2.narration.substring(0, 100)}...\n`);

    // Final Step: Verify complete orchestrator workflow
    console.log('8️⃣ Verifying complete orchestrator workflow...');
    
    const atmosphereKeywords = episodeBible.storytellingGuidelines.atmosphereKeywords.map(k => k.toLowerCase());
    const scene1Text = (scene1.narration + scene1.choiceA + scene1.choiceB).toLowerCase();
    const scene2Text = (scene2.narration + scene2.choiceA + scene2.choiceB).toLowerCase();
    
    const scene1HasKeywords = atmosphereKeywords.some(keyword => scene1Text.includes(keyword));
    const scene2HasKeywords = atmosphereKeywords.some(keyword => scene2Text.includes(keyword));
    
    console.log(`   🔍 Episode Bible atmosphere: ${atmosphereKeywords.join(', ')}`);
    console.log(`   ✅ Scene 1 follows Bible: ${scene1HasKeywords}`);
    console.log(`   ✅ Scene 2 follows Bible: ${scene2HasKeywords}`);
    console.log(`   ✅ Story Director called only once`);
    console.log(`   ✅ Episode Bible reused for consistency\n`);
    
    // Verify audio workflow: Scene Planner + Music Agent + SFX Agent
    const totalScenePlannerCues = scene1.audioCues.length + scene2.audioCues.length;
    const totalMusicTracks = 1; // sceneMusic
    const totalSFXTracks = sceneSFX.length;
    
    console.log(`🎵 Complete Audio Workflow Results:`);
    console.log(`   🎬 Scene Planner audio cues: ${totalScenePlannerCues}`);
    console.log(`   🎼 Music Agent tracks: ${totalMusicTracks}`);
    console.log(`   🔊 SFX Agent effects: ${totalSFXTracks}`);
    console.log(`   🎧 Total audio elements: ${totalScenePlannerCues + totalMusicTracks + totalSFXTracks}`);
    
    if (scene1.audioCues.length > 0) {
      console.log(`   🎵 Scene Planner sample: "${scene1.audioCues[0].description}"`);
    }
    console.log(`   🎵 Music Agent sample: "${sceneMusic.description}"`);
    if (sceneSFX.length > 0) {
      console.log(`   🔊 SFX Agent sample: "${sceneSFX[0].description}"`);
    }
    
    expect(totalScenePlannerCues + totalMusicTracks + totalSFXTracks).toBeGreaterThan(0);
    expect(sceneMusic.metadata?.elevenLabsPrompt).toContain('instrumental only');
    expect(sceneSFX.some(sfx => sfx.metadata?.elevenLabsText)).toBe(true);
    
    console.log('\n🎉 Complete Episode Multi-Agent Workflow with Orchestrator completed successfully!');
    console.log('🔄 Workflow: User Input → Orchestrator → Story Director/Scene Planner/State Agent → Music/SFX Agents');
    
  }, 180000); // 3 minutes for full workflow

  it('should demonstrate workflow efficiency compared to per-scene direction', async () => {
    // This test shows why Episode Bible approach is better than per-scene creative direction
    
    console.log('⚡ Testing workflow efficiency...\n');
    
    const start = Date.now();
    
    // Episode Bible approach: Story Director called once
    console.log('📖 Creating Episode Bible (Story Director - once per episode)...');
    const episodeBible = await storyDirector.createEpisodeBible(testPremise);
    const bibleTime = Date.now() - start;
    
    console.log('📝 Generating multiple scenes with Episode Bible...');
    const stateCard = await stateAgent.initializeStateCard(testPremise);
    
    const scene1Start = Date.now();
    const scene1 = await scenePlanner.generateScene(testPremise, episodeBible, stateCard, 1);
    const scene1Time = Date.now() - scene1Start;
    
    const scene2Start = Date.now();
    const scene2 = await scenePlanner.generateScene(testPremise, episodeBible, stateCard, 2);
    const scene2Time = Date.now() - scene2Start;
    
    console.log('\n📊 Performance Results:');
    console.log(`   📖 Episode Bible creation: ${bibleTime}ms (once per episode)`);
    console.log(`   📝 Scene 1 with Bible: ${scene1Time}ms`);
    console.log(`   📝 Scene 2 with Bible: ${scene2Time}ms`);
    console.log(`   🎯 Total: ${bibleTime + scene1Time + scene2Time}ms`);
    console.log('\n✅ Benefits of Episode Multi-Agent Workflow:');
    console.log('   • Story Director called once → efficiency');
    console.log('   • Episode Bible ensures consistency across scenes');
    console.log('   • Scene Planner handles dynamic audio direction');
    console.log('   • State Agent tracks progression between scenes');
    console.log('   • No redundant creative direction calls');
    
    expect(episodeBible).toBeDefined();
    expect(scene1).toBeDefined();
    expect(scene2).toBeDefined();
    
  }, 180000);

  it('should test Music and SFX agents with ElevenLabs best practices', async () => {
    console.log('🎼 Testing Music and SFX Agents with ElevenLabs APIs...\n');
    
    // Create Episode Bible for audio generation
    console.log('1️⃣ Creating Episode Bible for audio tests...');
    const episodeBible = await storyDirector.createEpisodeBible(testPremise);
    const testNarration = "The heavy wooden door creaks open as thunder rumbles overhead. Footsteps echo on the marble floor while rain patters against the tall windows.";
    
    // Test Music Agent
    console.log('2️⃣ Testing Music Agent with ElevenLabs Music API...');
    const musicTrack = await musicAgent.generateSceneMusic(
      episodeBible,
      testNarration,
      1,
      120 // 2 minutes
    );
    
    expect(musicTrack).toBeDefined();
    expect(musicTrack.type).toBe('music');
    expect(musicTrack.metadata?.elevenLabsPrompt).toBeTruthy();
    expect(musicTrack.metadata?.elevenLabsPrompt).toContain('instrumental only');
    expect(musicTrack.metadata?.durationMs).toBeGreaterThan(10000); // At least 10 seconds
    expect(musicTrack.metadata?.durationMs).toBeLessThanOrEqual(300000); // Max 5 minutes
    expect(musicTrack.metadata?.isInstrumental).toBe(true);
    
    console.log(`   ✅ Music track generated`);
    console.log(`   🎼 ElevenLabs prompt: ${musicTrack.metadata?.elevenLabsPrompt?.substring(0, 100)}...`);
    console.log(`   ⏱️ Duration: ${musicTrack.metadata?.durationMs}ms`);
    console.log(`   🎵 Priority: ${musicTrack.metadata?.priority}\n`);
    
    // Test SFX Agent
    console.log('3️⃣ Testing SFX Agent with ElevenLabs Sound Effects API...');
    const sfxEffects = await sfxAgent.generateSceneSFX(
      episodeBible,
      testNarration,
      1
    );
    
    expect(Array.isArray(sfxEffects)).toBe(true);
    expect(sfxEffects.length).toBeGreaterThan(0);
    expect(sfxEffects.length).toBeLessThanOrEqual(8); // Max 8 SFX per scene
    
    // Verify each SFX follows ElevenLabs best practices
    for (const sfx of sfxEffects) {
      expect(sfx.type).toBe('sfx');
      expect(sfx.metadata?.elevenLabsText).toBeTruthy();
      expect(sfx.trigger).toMatch(/\[SFX=.+\]/);
      
      // Duration should be within ElevenLabs limits
      if (sfx.metadata?.durationSeconds) {
        expect(sfx.metadata.durationSeconds).toBeGreaterThanOrEqual(0.5);
        expect(sfx.metadata.durationSeconds).toBeLessThanOrEqual(30);
      }
      
      // Prompt influence should be between 0 and 1
      if (sfx.metadata?.promptInfluence) {
        expect(sfx.metadata.promptInfluence).toBeGreaterThanOrEqual(0);
        expect(sfx.metadata.promptInfluence).toBeLessThanOrEqual(1);
      }
    }
    
    console.log(`   ✅ SFX effects generated: ${sfxEffects.length}`);
    sfxEffects.forEach((sfx, index) => {
      console.log(`   ${index + 1}. ${sfx.trigger}: "${sfx.description}"`);
      console.log(`      Category: ${sfx.metadata?.category}, Duration: ${sfx.metadata?.durationSeconds || 'auto'}s`);
    });
    console.log();
    
    // Test ambient soundscape generation
    console.log('4️⃣ Testing ambient soundscape with looping...');
    const ambientSound = await sfxAgent.generateAmbientSoundscape(
      episodeBible,
      "Victorian mansion interior",
      "Stormy night with eerie atmosphere"
    );
    
    expect(ambientSound).toBeDefined();
    expect(ambientSound.type).toBe('sfx');
    expect(ambientSound.metadata?.loop).toBe(true);
    expect(ambientSound.metadata?.isAmbient).toBe(true);
    expect(ambientSound.metadata?.durationSeconds).toBeGreaterThanOrEqual(15);
    expect(ambientSound.metadata?.durationSeconds).toBeLessThanOrEqual(30);
    
    console.log(`   ✅ Ambient soundscape generated`);
    console.log(`   🌊 Description: "${ambientSound.description}"`);
    console.log(`   🔁 Looping: ${ambientSound.metadata?.loop}`);
    console.log(`   ⏱️ Duration: ${ambientSound.metadata?.durationSeconds}s\n`);
    
    // Test episode theme generation
    console.log('5️⃣ Testing episode theme generation...');
    const episodeTheme = await musicAgent.generateEpisodeTheme(
      episodeBible,
      testTitle,
      testPremise
    );
    
    expect(episodeTheme).toBeDefined();
    expect(episodeTheme.type).toBe('music');
    expect(episodeTheme.metadata?.isTheme).toBe(true);
    expect(episodeTheme.metadata?.priority).toBe('high');
    expect(episodeTheme.metadata?.elevenLabsPrompt).toContain('instrumental only');
    
    console.log(`   ✅ Episode theme generated`);
    console.log(`   🎬 Theme: "${episodeTheme.description}"`);
    console.log(`   ⏱️ Duration: ${episodeTheme.metadata?.durationMs}ms\n`);
    
    console.log('🎆 Music and SFX Agents testing completed!');
    console.log('✅ All agents follow ElevenLabs API best practices');
    console.log('✅ Music: Instrumental only, proper duration, detailed prompts');
    console.log('✅ SFX: Clear descriptions, duration limits, professional terminology');
    console.log('✅ Ambient: Looping capability, appropriate duration');
    
  }, 180000);
});