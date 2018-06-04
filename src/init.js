module.exports = [
  "init [name]",
  "Initialize the project structure",
  yargs => {
    yargs.positional("name", {
      type: "string",
      describe: "Name of the project to initialize"
    });
  },
  argv => {
    console.log("Init", argv.name);
  }
];
