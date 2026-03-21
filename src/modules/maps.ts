import { GameState, MAP_WIDTH, MAP_HEIGHT } from '../types';

export const drawMinimap = (minimapCanvas: HTMLCanvasElement, state: GameState, canvasWidth: number, canvasHeight: number) => {
  const mCtx = minimapCanvas.getContext('2d');
  if (!mCtx) return;
  
  mCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
  mCtx.save();
  
  // Radar scale: 200px represents 3000 units
  const radarSize = 3000;
  const scale = minimapCanvas.width / radarSize;
  
  mCtx.translate(minimapCanvas.width / 2, minimapCanvas.height / 2);
  mCtx.scale(scale, scale);
  mCtx.translate(-state.player.x, -state.player.y);
  
  // Draw background
  mCtx.fillStyle = '#18181b'; // zinc-900
  mCtx.fillRect(state.player.x - radarSize/2, state.player.y - radarSize/2, radarSize, radarSize);
  
  // Draw obstacles
  mCtx.fillStyle = '#52525b'; // zinc-600
  for (const obs of state.obstacles) {
    if (obs.x < state.player.x + radarSize/2 && obs.x + obs.width > state.player.x - radarSize/2 &&
        obs.y < state.player.y + radarSize/2 && obs.y + obs.height > state.player.y - radarSize/2) {
      mCtx.fillRect(obs.x, obs.y, obs.width, obs.height);
    }
  }
  
  // Draw extraction
  mCtx.fillStyle = 'rgba(16, 185, 129, 0.3)';
  mCtx.fillRect(state.extraction.x, state.extraction.y, state.extraction.width, state.extraction.height);
  
  // Draw enemies
  mCtx.fillStyle = '#ef4444'; // red-500
  for (const e of state.enemies) {
    mCtx.beginPath();
    if (e.type === 'circle') {
      mCtx.arc(e.x, e.y, e.radius * 2, 0, Math.PI * 2);
    } else if (e.type === 'square') {
      mCtx.rect(e.x - e.radius * 2, e.y - e.radius * 2, e.radius * 4, e.radius * 4);
    } else if (e.type === 'triangle') {
      mCtx.moveTo(e.x, e.y - e.radius * 2);
      mCtx.lineTo(e.x - e.radius * 2, e.y + e.radius * 2);
      mCtx.lineTo(e.x + e.radius * 2, e.y + e.radius * 2);
      mCtx.closePath();
    }
    mCtx.fill();
  }
  
  // Draw player
  mCtx.fillStyle = '#3b82f6'; // blue-500
  mCtx.beginPath();
  mCtx.arc(state.player.x, state.player.y, state.player.radius * 2, 0, Math.PI * 2);
  mCtx.fill();
  
  // Draw camera viewport
  mCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  mCtx.lineWidth = 2 / scale;
  mCtx.strokeRect(state.camera.x, state.camera.y, canvasWidth, canvasHeight);
  
  mCtx.restore();
};

export const drawLargeMap = (largeMapCanvas: HTMLCanvasElement, state: GameState) => {
  const lCtx = largeMapCanvas.getContext('2d');
  if (!lCtx) return;
  
  lCtx.clearRect(0, 0, largeMapCanvas.width, largeMapCanvas.height);
  lCtx.save();
  
  const scaleX = largeMapCanvas.width / MAP_WIDTH;
  const scaleY = largeMapCanvas.height / MAP_HEIGHT;
  lCtx.scale(scaleX, scaleY);
  
  // Draw background
  lCtx.fillStyle = '#18181b';
  lCtx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  
  // Draw obstacles
  lCtx.fillStyle = '#52525b';
  for (const obs of state.obstacles) {
    lCtx.fillRect(obs.x, obs.y, obs.width, obs.height);
  }
  
  // Draw extraction
  lCtx.fillStyle = 'rgba(16, 185, 129, 0.3)';
  lCtx.fillRect(state.extraction.x, state.extraction.y, state.extraction.width, state.extraction.height);
  
  // Draw enemies (only those within minimap range)
  lCtx.fillStyle = '#ef4444';
  const radarRadius = 1500;
  for (const e of state.enemies) {
    if (Math.hypot(e.x - state.player.x, e.y - state.player.y) <= radarRadius) {
      lCtx.beginPath();
      if (e.type === 'circle') {
        lCtx.arc(e.x, e.y, e.radius * 4, 0, Math.PI * 2);
      } else if (e.type === 'square') {
        lCtx.rect(e.x - e.radius * 4, e.y - e.radius * 4, e.radius * 8, e.radius * 8);
      } else if (e.type === 'triangle') {
        lCtx.moveTo(e.x, e.y - e.radius * 4);
        lCtx.lineTo(e.x - e.radius * 4, e.y + e.radius * 4);
        lCtx.lineTo(e.x + e.radius * 4, e.y + e.radius * 4);
        lCtx.closePath();
      }
      lCtx.fill();
    }
  }
  
  // Draw player
  lCtx.fillStyle = '#3b82f6';
  lCtx.beginPath();
  lCtx.arc(state.player.x, state.player.y, state.player.radius * 4, 0, Math.PI * 2);
  lCtx.fill();
  
  lCtx.restore();
};
