export interface Chapter {
  id: string;
  number: number;
  title: string;
  readingTime: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  authorBio: string;
  genre: string;
  price: "free" | "premium";
  rating: number;
  coverColor: string;
  description: string;
  fullDescription: string;
  publishedDate: string;
  pageCount: number;
  language: string;
  chapters: Chapter[];
}

export const genres = [
  "All Genres",
  "Literary Fiction",
  "Poetry",
  "Philosophy",
  "Science Fiction",
  "Drama",
  "Adventure",
  "Psychology",
  "Mystery",
  "Romance",
  "Non-Fiction",
  "Fantasy",
] as const;

export const authors = [
  "All Authors",
  "Priya Sharma",
  "Arjun Mehta",
  "Kavya Nair",
  "Vikram Das",
  "Meera Krishnan",
  "Siddharth Rao",
  "Ananya Bhatt",
  "Rohan Kapoor",
  "Ishita Sen",
  "Aditya Verma",
] as const;

export const sortOptions = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "rating", label: "Highest Rated" },
  { value: "title-asc", label: "Title (A-Z)" },
  { value: "title-desc", label: "Title (Z-A)" },
] as const;

const generateChapters = (count: number): Chapter[] => {
  const chapterTitles = [
    "The Beginning", "First Steps", "Unexpected Turns", "Rising Tension",
    "The Discovery", "Crossroads", "Into the Unknown", "Revelations",
    "The Climax", "Resolution", "New Horizons", "Epilogue"
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: `ch-${i + 1}`,
    number: i + 1,
    title: chapterTitles[i] || `Chapter ${i + 1}`,
    readingTime: `${Math.floor(Math.random() * 15) + 5} min`,
  }));
};

const authorBios: Record<string, string> = {
  "Priya Sharma": "Priya Sharma is an award-winning author known for her lyrical prose and deep exploration of human emotions. She has published over a dozen novels and her work has been translated into fifteen languages.",
  "Arjun Mehta": "Arjun Mehta is a former journalist turned adventure writer. His experiences traveling to remote corners of the world inform his vivid storytelling and richly detailed settings.",
  "Kavya Nair": "Kavya Nair is a celebrated poet whose work has appeared in numerous literary journals. She teaches creative writing and hosts poetry workshops across the country.",
  "Vikram Das": "Vikram Das writes sweeping family sagas that explore tradition, modernity, and the ties that bind us. He divides his time between Mumbai and the countryside.",
  "Meera Krishnan": "Dr. Meera Krishnan is a clinical psychologist and author who bridges the gap between academic research and accessible storytelling. Her books have helped millions understand the human mind.",
  "Siddharth Rao": "Siddharth Rao is a philosopher and essayist whose meditations on life have earned him a devoted readership. He is known for his contemplative, thought-provoking style.",
  "Ananya Bhatt": "Ananya Bhatt is a science fiction author with a background in environmental science. Her speculative works imagine futures shaped by technology and climate.",
  "Rohan Kapoor": "Rohan Kapoor is a mystery writer whose intricate plots and atmospheric settings have made him a bestseller. He draws inspiration from small-town secrets and human nature.",
  "Ishita Sen": "Ishita Sen is a fantasy author who weaves together mythology and imagination. Her immersive worlds have captivated readers of all ages.",
  "Aditya Verma": "Aditya Verma writes contemporary romance with heart and humor. His stories celebrate love in all its forms and the courage it takes to be vulnerable.",
};

export const mockBooks: Book[] = [
  {
    id: "1",
    title: "The Silent Garden",
    author: "Priya Sharma",
    authorBio: authorBios["Priya Sharma"],
    genre: "Literary Fiction",
    price: "free",
    rating: 4.6,
    coverColor: "bg-accent",
    description: "A poetic exploration of solitude and nature.",
    fullDescription: "In 'The Silent Garden,' Priya Sharma crafts an exquisite meditation on solitude, nature, and the quiet spaces where we find ourselves. The novel follows Maya, a botanist who retreats to her grandmother's abandoned garden after a personal loss. As she tends to the overgrown plants and uncovers hidden corners of the garden, she also excavates memories and truths long buried. Sharma's prose is luminous and unhurried, inviting readers to slow down and savor each beautifully constructed sentence. This is a book about healing, about the conversations we have with silence, and about finding beauty in the overlooked corners of life.",
    publishedDate: "2024-08-15",
    pageCount: 284,
    language: "English",
    chapters: generateChapters(10),
  },
  {
    id: "2",
    title: "Beyond the Horizon",
    author: "Arjun Mehta",
    authorBio: authorBios["Arjun Mehta"],
    genre: "Adventure",
    price: "free",
    rating: 4.4,
    coverColor: "bg-secondary",
    description: "An epic journey across uncharted territories.",
    fullDescription: "Arjun Mehta delivers a breathtaking adventure in 'Beyond the Horizon.' When explorer Kabir receives a cryptic map from his late father, he embarks on a journey that takes him from the bustling streets of Delhi to the remote peaks of the Himalayas and beyond. Along the way, he encounters ancient monasteries, hidden tribes, and challenges that test his physical and mental limits. Mehta's firsthand experience as a travel journalist shines through in the vivid descriptions and authentic details. This is a story about the call of the unknown, the bonds forged in adversity, and the discovery that the greatest adventures often lead us back to ourselves.",
    publishedDate: "2024-06-20",
    pageCount: 342,
    language: "English",
    chapters: generateChapters(12),
  },
  {
    id: "3",
    title: "Letters to Myself",
    author: "Kavya Nair",
    authorBio: authorBios["Kavya Nair"],
    genre: "Poetry",
    price: "free",
    rating: 4.8,
    coverColor: "bg-muted",
    description: "Intimate verses on love, loss, and self-discovery.",
    fullDescription: "Kavya Nair's 'Letters to Myself' is a collection of poems that reads like a private journal shared with the reader. Divided into four sections—Dawn, Noon, Dusk, and Night—the collection traces the arc of a day and, metaphorically, the seasons of a life. Nair writes with unflinching honesty about heartbreak, hope, identity, and the small moments that define us. Her language is accessible yet profound, each poem a gem that reveals new facets upon rereading. This is a book to keep on your bedside table, to return to in moments of joy and sorrow alike.",
    publishedDate: "2024-09-01",
    pageCount: 156,
    language: "English",
    chapters: generateChapters(8),
  },
  {
    id: "4",
    title: "The Last Monsoon",
    author: "Vikram Das",
    authorBio: authorBios["Vikram Das"],
    genre: "Drama",
    price: "free",
    rating: 4.5,
    coverColor: "bg-accent",
    description: "A family saga set against the backdrop of changing seasons.",
    fullDescription: "Vikram Das weaves a rich tapestry of family, tradition, and change in 'The Last Monsoon.' The Deshpande family has gathered at their ancestral home for what may be the final monsoon season before the property is sold. Over the course of a week, old wounds resurface, secrets are revealed, and three generations must reckon with their shared history. Das captures the rhythms of Indian family life with warmth and nuance, and his descriptions of the monsoon—its sounds, smells, and transformative power—are nothing short of magical. A deeply moving novel about letting go and holding on.",
    publishedDate: "2024-05-10",
    pageCount: 398,
    language: "English",
    chapters: generateChapters(11),
  },
  {
    id: "5",
    title: "The Architecture of Dreams",
    author: "Meera Krishnan",
    authorBio: authorBios["Meera Krishnan"],
    genre: "Psychology",
    price: "premium",
    rating: 4.8,
    coverColor: "bg-accent",
    description: "Understanding the structures that shape our unconscious mind.",
    fullDescription: "Dr. Meera Krishnan brings her expertise as a clinical psychologist to 'The Architecture of Dreams,' a groundbreaking exploration of the unconscious mind. Drawing on case studies, research, and her own therapeutic practice, Krishnan examines how our dreams reflect and shape our waking lives. She introduces the concept of 'dream architecture'—the recurring structures, symbols, and narratives that appear in our dreams—and shows how understanding these patterns can lead to profound personal insight. Accessible, illuminating, and deeply humane, this book is essential reading for anyone interested in the mysteries of the mind.",
    publishedDate: "2024-10-05",
    pageCount: 312,
    language: "English",
    chapters: generateChapters(9),
  },
  {
    id: "6",
    title: "Conversations with Time",
    author: "Siddharth Rao",
    authorBio: authorBios["Siddharth Rao"],
    genre: "Philosophy",
    price: "premium",
    rating: 4.9,
    coverColor: "bg-secondary",
    description: "Meditations on existence, impermanence, and meaning.",
    fullDescription: "In 'Conversations with Time,' philosopher Siddharth Rao invites readers to sit with life's biggest questions. Through a series of interconnected essays, Rao explores themes of existence, impermanence, purpose, and the search for meaning in a chaotic world. His writing is contemplative yet accessible, drawing on Eastern and Western philosophical traditions as well as everyday observations. Each chapter is a meditation, designed to be read slowly and revisited often. This is a book that doesn't offer easy answers but instead encourages deeper questioning—and in that questioning, a kind of peace.",
    publishedDate: "2024-11-12",
    pageCount: 248,
    language: "English",
    chapters: generateChapters(10),
  },
  {
    id: "7",
    title: "The Code of Seasons",
    author: "Ananya Bhatt",
    authorBio: authorBios["Ananya Bhatt"],
    genre: "Science Fiction",
    price: "premium",
    rating: 4.7,
    coverColor: "bg-muted",
    description: "A future where climate is controlled by ancient algorithms.",
    fullDescription: "Ananya Bhatt's 'The Code of Seasons' imagines a future where climate change has been reversed—not by modern technology, but by the rediscovery of ancient algorithms encoded in temple inscriptions. Protagonist Dr. Zara Iyer, a computational archaeologist, uncovers these algorithms and must decide whether to share them with a world fractured by corporate interests and political strife. Bhatt combines rigorous scientific speculation with thought-provoking ethical dilemmas, creating a novel that is both thrilling and timely. A must-read for fans of climate fiction and intelligent sci-fi.",
    publishedDate: "2024-07-22",
    pageCount: 376,
    language: "English",
    chapters: generateChapters(12),
  },
  {
    id: "8",
    title: "Whispers in the Dark",
    author: "Rohan Kapoor",
    authorBio: authorBios["Rohan Kapoor"],
    genre: "Mystery",
    price: "premium",
    rating: 4.5,
    coverColor: "bg-secondary",
    description: "A gripping tale of secrets buried in a small town.",
    fullDescription: "Rohan Kapoor delivers a masterclass in suspense with 'Whispers in the Dark.' When journalist Nisha returns to her hometown of Malgudi after twenty years, she intends to write a simple feature story. But when she discovers that a childhood friend's death—long ruled an accident—may have been something more sinister, she begins to dig into secrets the town would prefer stay buried. Kapoor's atmospheric prose brings the small town to life, and his carefully constructed plot keeps readers guessing until the final page. A gripping, atmospheric mystery that explores the darkness lurking beneath quiet surfaces.",
    publishedDate: "2024-04-18",
    pageCount: 328,
    language: "English",
    chapters: generateChapters(11),
  },
  {
    id: "9",
    title: "The Forgotten Path",
    author: "Ishita Sen",
    authorBio: authorBios["Ishita Sen"],
    genre: "Fantasy",
    price: "free",
    rating: 4.3,
    coverColor: "bg-accent",
    description: "An enchanting journey through mythical lands.",
    fullDescription: "Ishita Sen's 'The Forgotten Path' is a sweeping fantasy that draws on Indian mythology to create a world both familiar and fantastical. When twelve-year-old Aarav discovers a hidden path in the forest behind his grandmother's house, he is transported to Aloka, a realm where gods and demons walk among mortals. To find his way home, Aarav must embark on a quest that will take him through enchanted forests, ancient temples, and the depths of his own courage. Sen's world-building is rich and immersive, and her storytelling captures the wonder of classic fairy tales with a distinctly Indian flavor.",
    publishedDate: "2024-03-05",
    pageCount: 294,
    language: "English",
    chapters: generateChapters(10),
  },
  {
    id: "10",
    title: "Hearts in Transit",
    author: "Aditya Verma",
    authorBio: authorBios["Aditya Verma"],
    genre: "Romance",
    price: "premium",
    rating: 4.6,
    coverColor: "bg-muted",
    description: "Love found in the most unexpected places.",
    fullDescription: "Aditya Verma's 'Hearts in Transit' is a warm, witty romance about two strangers whose lives intersect on a cross-country train journey. Diya, a wedding photographer fleeing a broken engagement, and Sameer, an entrepreneur running from corporate burnout, find themselves sharing a cabin from Mumbai to Kolkata. Over three days and thousands of miles, they share stories, challenge each other's assumptions, and discover an unexpected connection. Verma writes with humor and heart, creating characters who feel real and a love story that feels earned. A delightful read for anyone who believes in second chances.",
    publishedDate: "2024-12-01",
    pageCount: 268,
    language: "English",
    chapters: generateChapters(9),
  },
  {
    id: "11",
    title: "The Mind's Labyrinth",
    author: "Meera Krishnan",
    authorBio: authorBios["Meera Krishnan"],
    genre: "Psychology",
    price: "free",
    rating: 4.4,
    coverColor: "bg-secondary",
    description: "Exploring the complexities of human cognition.",
    fullDescription: "In 'The Mind's Labyrinth,' Dr. Meera Krishnan takes readers on a fascinating journey through the complexities of human cognition. From memory and perception to decision-making and creativity, Krishnan explains how our brains construct our experience of reality. She weaves together cutting-edge neuroscience, psychological research, and compelling case studies to create a book that is both informative and deeply engaging. Whether you're a student of psychology or simply curious about how your mind works, this book offers insights that will change the way you think about thinking.",
    publishedDate: "2024-02-14",
    pageCount: 302,
    language: "English",
    chapters: generateChapters(10),
  },
  {
    id: "12",
    title: "Echoes of Tomorrow",
    author: "Ananya Bhatt",
    authorBio: authorBios["Ananya Bhatt"],
    genre: "Science Fiction",
    price: "premium",
    rating: 4.8,
    coverColor: "bg-accent",
    description: "Time travel and its unintended consequences.",
    fullDescription: "Ananya Bhatt returns with 'Echoes of Tomorrow,' a mind-bending exploration of time travel and its consequences. When physicist Dr. Arun Sharma accidentally creates a window to the past, he sees an opportunity to prevent personal tragedy. But each change he makes ripples through time in unexpected ways, creating new timelines and new dilemmas. Bhatt handles the paradoxes of time travel with intelligence and care, never losing sight of the human story at the heart of the novel. This is science fiction at its best—speculative, thought-provoking, and emotionally resonant.",
    publishedDate: "2024-08-30",
    pageCount: 356,
    language: "English",
    chapters: generateChapters(11),
  },
];
