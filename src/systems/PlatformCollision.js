export function configureOneWayPlatform(body) {
  if (!body?.checkCollision) return false;

  body.checkCollision.up = true;
  body.checkCollision.down = false;
  body.checkCollision.left = false;
  body.checkCollision.right = false;
  return true;
}
