import fp from 'fastify-plugin'

export default fp(async (app) => {
  app.decorate('auth', async (req, reply) => {
    try {
      await req.jwtVerify()
    } catch {
      return reply.code(401).send({ error: '未登录或登录已过期' })
    }
  })
})
