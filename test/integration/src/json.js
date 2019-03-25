module.exports.main = async function main(payload) {
  return {
    response: {
      body: {
        body: payload.content.body,
        meta: payload.content.meta,
        intro: payload.content.intro,
        title: payload.content.title,
      }
    }
  }
};