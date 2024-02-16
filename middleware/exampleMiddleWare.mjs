const customMiddleWare = (req, res, next) => {
  console.log("Hello from my custom middleware");
  next();
};

export default customMiddleWare;
