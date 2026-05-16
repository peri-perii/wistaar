// Pool of 65 diverse literary paragraphs for daily rotation
const paragraphPool: string[] = [
  // Morning / Awakening
  `The first light of dawn crept across the horizon like a whispered promise, painting the sky in shades of rose and lavender. Birds stirred in the branches overhead, their songs weaving together into a symphony that had been performing since time immemorial.`,
  `She opened her eyes to a world transformed overnight. Frost had etched intricate patterns on the windowpane, each crystal a tiny cathedral of ice. The silence of the morning was absolute, as if the universe itself were holding its breath.`,
  `Morning arrived not with a shout but with a sigh—a gentle exhale of golden light that spread across the rooftops and slipped through half-drawn curtains. The kettle whistled, and with it came the comforting ritual of a new beginning.`,
  `The alarm never rang, and yet he woke precisely at the moment the sun touched the distant hills. There was something ancient in that timing, something that predated clocks and calendars—a rhythm written into the very marrow of his bones.`,
  `Dew clung to every blade of grass like tiny diamonds scattered by a careless jeweler. The garden, still wrapped in the cool breath of night, seemed to shimmer with possibility, each droplet reflecting a miniature world of its own.`,

  // Journey / Movement
  `The road stretched ahead, a ribbon of dust and stone winding through valleys that had never known the sound of engines. Each step raised a small cloud that settled behind them like a trail of whispered goodbyes.`,
  `They traveled in silence, the kind that forms between people who have shared enough words to understand that some truths can only be communicated through presence. The mountains watched their passage with ancient indifference.`,
  `The train rocked gently as it wound through the countryside, its rhythm a lullaby for the weary passengers. Outside, fields of sunflowers turned their faces to track the sun, a slow and devoted procession that had no end and no beginning.`,
  `Navigation by starlight required a different kind of faith—not in instruments or maps, but in the ancient relationship between the human eye and the celestial dome. She traced the constellations with her finger, finding her way home.`,
  `The bridge swayed slightly under their weight, suspended between two cliffs like a thought caught between two minds. Below, the river churned white and green, carrying with it the debris of last week's storm and the promise of clearer waters ahead.`,

  // Discovery / Wonder
  `Behind the waterfall, they found a cave that glittered with phosphorescent moss, casting an otherworldly green glow on the wet stone walls. It was like stepping into a dream that the earth had been keeping secret for millennia.`,
  `The manuscript was older than anyone had imagined. Its pages, thin as butterfly wings, contained not just words but illustrations of creatures that no living person had ever seen—or perhaps, that no living person had ever looked closely enough to notice.`,
  `She turned the corner and stopped. The street, usually bustling with vendors and commuters, was completely empty. In its place, a carpet of wildflowers had pushed through the cracks in the pavement, reclaiming what had always been theirs.`,
  `The telescope revealed not just stars but the spaces between them—vast, unfathomable gulfs of darkness that somehow made the points of light burn brighter. It was in the emptiness, he realized, that the meaning lived.`,
  `Opening the door to the attic was like opening a door to another century. Dust motes danced in the single shaft of light, and trunks lined the walls like sleeping sentinels, each one guarding memories that no one had visited in years.`,

  // Reflection / Philosophy
  `There is a particular quality to silence that most people never notice. It is not the absence of sound but the presence of something else—a fullness, a weight, a texture that can only be perceived when we stop trying to fill every moment with noise.`,
  `Memory, he decided, was not a library but a garden. It grew wild and untended, vines of recollection tangling with the weeds of imagination until it became impossible to distinguish what had truly happened from what had merely been felt.`,
  `The philosopher had written that we are not beings who think but thoughts that have learned to be. She read the line three times, each reading peeling back another layer of meaning, like an onion made of light.`,
  `Forgiveness, she learned, was not a single act but a daily practice—like tending a fire that the winds of resentment kept trying to extinguish. Some days the flame burned bright; other days it was barely an ember.`,
  `The paradox of knowledge is that the more you acquire, the more you realize how little you know. The wisest among us are not those with the most answers but those who have learned to sit comfortably with questions.`,

  // Nature / Landscape
  `The forest floor was a tapestry of fallen leaves, each one a different shade of amber, crimson, and gold. Beneath them, the earth was soft and yielding, alive with the quiet industry of countless unseen creatures.`,
  `Storm clouds gathered on the horizon like an army marshaling its forces. The air grew heavy with the scent of petrichor, that ancient perfume that rises from the earth in anticipation of rain.`,
  `The ocean at night was a different creature entirely—a vast, breathing darkness that spoke in the language of tides and currents. The moon laid a silver path across its surface, an invitation that led nowhere and everywhere at once.`,
  `Autumn arrived not on a particular day but as a gradual loosening, a letting go. The trees released their leaves one by one, each falling leaf a small surrender to the inevitable cycle of growth and decay.`,
  `The desert bloomed once a year, and those who were fortunate enough to witness it spoke of it in hushed tones, as if describing a miracle. For three brief days, the barren landscape erupted in color so vivid it seemed impossible.`,

  // Human Connection
  `They sat across from each other at the small café table, two people separated by decades of living and united by the simple act of sharing a meal. The bread was warm, the wine was good, and the conversation flowed like water finding its level.`,
  `The letter arrived on a Tuesday, its envelope yellowed with age and bearing a stamp from a country that no longer existed. Inside, the handwriting was careful and deliberate, each word chosen with the precision of someone who understood that language was a bridge.`,
  `She recognized him not by his face, which time had altered beyond recognition, but by his laugh—that particular cascade of joy that had echoed through the hallways of their childhood like a bell that never stopped ringing.`,
  `The handshake lingered a moment longer than convention required, and in that extra second, something was communicated that words would have taken paragraphs to express. Trust, perhaps. Or recognition. Or simply the acknowledgment that they were both here, now, alive.`,
  `Children understand something that adults have forgotten: that the world is perpetually astonishing. Watch a child encounter a puddle for the first time, and you will see wonder in its purest form—uncalculated, ungoverned, and utterly sincere.`,

  // Mystery / Intrigue
  `The door had no handle, no keyhole, no hinges visible from the outside. It was simply a smooth rectangle of dark wood set into the stone wall, as if the building itself were keeping a secret that it had no intention of sharing.`,
  `Every night at precisely eleven minutes past midnight, the light in the tower window flickered three times. No one in the village could explain it, and those who had tried to investigate found their courage failing them at the threshold.`,
  `The map was incomplete. Entire coastlines trailed off into nothing, rivers ended abruptly in the middle of continents, and where a great city should have stood, there was only a single word written in fading ink: "Remember."`,
  `She found the notebook wedged between the cushions of the antique sofa, its leather cover worn smooth by years of handling. The pages were filled with equations that she, despite her doctorate in mathematics, could not begin to decipher.`,
  `The footprints in the snow led to the center of the frozen lake and simply stopped. There were no return tracks, no sign of disturbance in the ice. It was as if the person who had made them had simply ceased to exist.`,

  // Time / Change
  `The clock in the town square had been broken for so long that the residents had stopped thinking of it as a timepiece and started regarding it as a monument—a tribute to the idea that some things are meant to stand still.`,
  `Seasons changed the village the way emotions change a face—gradually, then all at once. One day the fields were green and humming with life; the next, it seemed, they were golden and hushed, waiting for the harvest that would mark the end of another cycle.`,
  `Old photographs have a particular power: they freeze not just images but the emotional weather of a moment. Looking at them years later is like opening a window into a room where the temperature of feeling has been perfectly preserved.`,
  `The ruins were beautiful in a way that new buildings never could be. Their crumbling walls and moss-covered stones spoke of endurance, of the slow negotiation between human ambition and nature's patient reclamation.`,
  `He measured his life not in years but in the books he had read, each one a chapter in a larger story that he was still trying to understand. Some had changed him overnight; others had worked their transformation over decades, like water smoothing stone.`,

  // Art / Creativity
  `The painter stood before the blank canvas with the same mixture of terror and excitement that a writer feels before an empty page. The first stroke was always the hardest—not because it determined everything, but because it made the infinite suddenly finite.`,
  `Music, unlike words, requires no translation. The melody that drifted from the open window spoke directly to something primal and universal—a shared emotional vocabulary that predated language itself by thousands of years.`,
  `The sculpture emerged from the marble not through addition but through subtraction. Each chip of stone removed was a decision, an act of faith that the form hidden inside would eventually reveal itself to patient hands and watchful eyes.`,
  `She wrote not to be understood but to understand. Each sentence was a small excavation, a careful brushing away of surface meanings to reveal the fossils of truth buried underneath. The words were tools, not destinations.`,
  `The theater was empty save for a single spotlight illuminating a bare stage. In that circle of light, anything could happen—any story could be told, any world could be conjured into being by nothing more than voice and gesture.`,

  // Courage / Challenge
  `Courage, she had come to understand, was not the absence of fear but the decision that something else mattered more. It was a calculation made in the heart, not the head, and it often surprised those who made it as much as those who witnessed it.`,
  `The mountain did not care about their plans or their schedules. It simply existed, massive and indifferent, challenging anyone who approached to reconsider the meaning of the word "impossible."`,
  `He had failed so many times that failure had lost its sting and become instead a familiar companion—reliable, instructive, and strangely comforting. Success, when it finally arrived, felt almost foreign by comparison.`,
  `The storm had taken everything: the roof, the garden, the carefully constructed sense of security that had taken years to build. But standing in the wreckage, she discovered something she hadn't expected—a feeling of lightness, of possibility, of beginning.`,
  `They told her the odds were against her, as if odds were a wall rather than a suggestion. She smiled, thanked them for their concern, and proceeded to do the thing they said couldn't be done.`,

  // Wisdom / Teaching
  `The teacher's greatest lesson had nothing to do with the subject she taught. It was contained in the way she listened—fully, without interruption, with a quality of attention that made the speaker feel not just heard but seen.`,
  `Wisdom arrived, as it always does, slightly too late to prevent the mistake but just in time to ensure it was never repeated. This, perhaps, is the true purpose of experience: not to shield us from error but to illuminate its lessons.`,
  `The old fisherman knew things about the sea that no textbook could teach. He read its moods the way a musician reads a score—intuitively, instinctively, with a fluency born of years spent in intimate dialogue with the waves.`,
  `There is a moment in every apprenticeship when the student surpasses the master. The great teachers recognize this moment not with jealousy but with joy, understanding that it represents not failure but fulfillment.`,
  `The proverb said that still waters run deep, but she had always preferred the rivers—those restless, seeking waterways that carved new channels through the landscape of understanding, never content to stay in one place.`,

  // Solitude / Inner World
  `Alone in the cabin, she discovered a version of herself that only existed in solitude. This self was quieter, more attentive, more honest. It had been waiting patiently behind the noise of daily life, like a star waiting for nightfall to become visible.`,
  `The garden was his sanctuary, a place where the chaos of the world reduced itself to simple, manageable tasks: water, prune, wait. In tending the plants, he found he was also tending something within himself.`,
  `Rain against the window, a book in her lap, the cat asleep on the chair beside her—these were the ingredients of a contentment so profound that she sometimes feared it, as if happiness this quiet might be too fragile to last.`,
  `He walked the empty beach at low tide, leaving footprints that the sea would erase within hours. There was something liberating in the impermanence of it, in the knowledge that the world would carry no record of his passage.`,
  `The monastery bells rang at intervals throughout the day, dividing time into periods of work and contemplation. Within those rhythms, the monks found not restriction but freedom—the freedom that comes from knowing exactly what each moment requires.`,

  // Hope / Future
  `Spring returned, as it always does, with a determination that made winter seem like a temporary misunderstanding. The first green shoots pushed through the frozen earth like small declarations of faith.`,
  `The child asked what the future would look like, and the grandmother smiled. "It will look," she said, "like whatever you decide to build. The materials are already here. The blueprint is yours to draw."`,
  `At the harbor, ships were being readied for voyages to places that existed, for now, only on charts and in imaginations. The sailors checked their rigging with the careful attention of people who understood that preparation is the mother of adventure.`,
  `The seed knows nothing of the flower it will become, yet it grows with unwavering purpose toward the light. Perhaps this is the deepest wisdom nature offers: that we need not understand our destination to move faithfully toward it.`,
  `Tomorrow, she thought, would be different. Not because the world would change overnight, but because she would meet it differently—with eyes a little wider, hands a little steadier, and a heart that had learned, at last, to trust the unfolding.`,
];

// Simple seeded pseudo-random number generator (mulberry32)
function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Simple string hash
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

// Get day of year (1-366)
function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Returns a unique set of paragraphs for a given chapter that changes daily.
 * Same day + same chapter = same content. Different day = different content.
 */
export function getDailyContent(
  chapterTitle: string,
  bookTitle: string,
  chapterNumber: number,
  paragraphCount: number = 10
): string[] {
  const dayOfYear = getDayOfYear();
  const year = new Date().getFullYear();
  const daySeed = dayOfYear + year * 365;
  const bookHash = hashString(bookTitle);
  const seed = daySeed + chapterNumber * 137 + bookHash;

  const rng = seededRandom(seed);

  // Fisher-Yates shuffle with seeded RNG
  const indices = Array.from({ length: paragraphPool.length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const count = Math.min(paragraphCount, paragraphPool.length);
  return indices.slice(0, count).map((i) => paragraphPool[i]);
}
