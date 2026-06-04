const leaves = Array.from({ length: 10 }, (_, index) => index + 1);
const clouds = Array.from({ length: 4 }, (_, index) => index + 1);
const breezes = Array.from({ length: 5 }, (_, index) => index + 1);

function IslandBackground() {
  return (
    <div className="island-background" aria-hidden="true">
      <div className="island-bg__sky" />
      <div className="island-bg__texture" />
      <div className="island-bg__ground" />
      <div className="island-bg__shoreline" />

      <div className="island-bg__clouds">
        {clouds.map((cloud) => (
          <span key={cloud} className={`island-cloud cloud-${cloud}`} />
        ))}
      </div>

      <div className="island-bg__breezes">
        {breezes.map((breeze) => (
          <span key={breeze} className={`island-breeze breeze-${breeze}`} />
        ))}
      </div>

      <div className="island-bg__leaves">
        {leaves.map((leaf) => (
          <span key={leaf} className={`island-leaf leaf-${leaf}`} />
        ))}
      </div>
    </div>
  );
}

export default IslandBackground;
