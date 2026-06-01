import { StageHead } from './StageHead';

export function PageHero({ label, title, description, children }) {
  return (
    <StageHead label={label} title={title} description={description}>
      {children}
    </StageHead>
  );
}
