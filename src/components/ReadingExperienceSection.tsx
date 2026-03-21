const features = [
  { title: "Distraction-Free", desc: "Clean interface for deep reading." },
  { title: "Gentle on Eyes", desc: "Comfortable typography for long sessions." },
  { title: "Secure Content", desc: "Your purchases stay private." },
  { title: "Sync Everywhere", desc: "Progress syncs across devices." },
];

const ReadingExperienceSection = () => {
  return (
    <section className="section-padding bg-foreground text-background">
      <div className="container-main">
        <div className="text-center mb-16">
          <p className="text-sm tracking-widest uppercase text-accent mb-4">
            The Experience
          </p>
          <h2 className="text-3xl md:text-4xl mb-4">
            Built for readers.
          </h2>
          <p className="text-background/60 max-w-md mx-auto">
            Every detail designed to help you get lost in great stories.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {features.map((f, i) => (
            <div key={i} className="text-center p-4">
              <h3 className="font-sans font-medium text-background mb-2">{f.title}</h3>
              <p className="text-sm text-background/50">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-background text-foreground rounded-xl p-8 md:p-12">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-border">
              <div className="w-8 h-12 bg-muted rounded" />
              <div>
                <p className="font-medium text-sm">The Silent Garden</p>
                <p className="text-xs text-muted-foreground">Chapter 3</p>
              </div>
            </div>
            
            <p className="font-serif text-lg leading-relaxed first-letter:text-4xl first-letter:font-serif first-letter:mr-2 first-letter:float-left first-letter:leading-none">
              The morning light filtered through the bamboo blinds, casting 
              long shadows across the worn wooden floor. She had always loved 
              this time of day...
            </p>

            <div className="flex justify-between items-center mt-8 pt-6 border-t border-border text-xs text-muted-foreground">
              <span>Page 42 of 286</span>
              <span>~3 min remaining</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ReadingExperienceSection;