// Integrate the acceleration curve, not its end-of-frame velocity. Collision
// checks use short steps so a slow rendered frame cannot skip narrow barriers.
export function advanceGroundActor(position, speed, targetSpeed, dt, dx, dz, canWalk, side = 1) {
 if (!Number.isFinite(dt) || dt <= 0) return speed;
 const duration = Math.min(.25, dt), count = Math.ceil(duration * 120), h = duration / count;
 const length = Math.hypot(dx, dz), ux = length > .001 ? dx / length : 0, uz = length > .001 ? dz / length : 0;
 const response = -Math.expm1(-10 * h);
 for (let i = 0; i < count; i++) {
  const travel = targetSpeed * h + (speed - targetSpeed) * response / 10;
  speed += (targetSpeed - speed) * response;
  if (Math.abs(travel) < 1e-12 || length <= .001) continue;
  const x = position.x + ux * travel, z = position.z + uz * travel;
  if (canWalk(x, z)) { position.x = x; position.z = z; }
  else {
   const bypass = Math.abs(travel) * side;
   const sx = position.x - uz * bypass, sz = position.z + ux * bypass;
   if (canWalk(sx, sz)) { position.x = sx; position.z = sz; }
  }
 }
 return speed;
}
