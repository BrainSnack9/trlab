import { CardImageGenerator } from '../CardImageGenerator';
import { CarouselStrip } from './CarouselStrip';

export function CardWorkspace({ cards, selected, setSelected, card, style, studio, plan, generatedImage, generatedImageHistory, setGeneratedImage, selectGeneratedImage }) {
  return (
    <div className="space-y-4">
      <CarouselStrip cards={cards} selected={selected} setSelected={setSelected} />
      <CardImageGenerator
        card={card}
        selected={selected}
        cards={cards}
        onSelectCard={setSelected}
        style={style}
        studio={studio}
        plan={plan}
        generatedImage={generatedImage}
        generatedImageHistory={generatedImageHistory}
        onGenerated={setGeneratedImage}
        onSelectGenerated={selectGeneratedImage}
      />
    </div>
  );
}
