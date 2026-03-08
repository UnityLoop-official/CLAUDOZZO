export default function handler(req, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  res.status(200).json({
    api_configured: !!apiKey,
    mode: apiKey ? 'live' : 'fake'
  });
}
