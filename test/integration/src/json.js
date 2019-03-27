module.exports.main = async function main(context) {
  return {
    response: {
      body: {
        body: context.content.body,
        meta: context.content.meta,
        intro: context.content.intro,
        title: context.content.title,
      }
    }
  }
};