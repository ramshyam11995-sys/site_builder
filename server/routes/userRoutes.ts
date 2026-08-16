import express from "express";
import { CreateUserProject, getUserCredits, getUserProject, getUserProjects, purchaseCredits, toggleProjectPublish } from "../controllers/userController.js";
import { protect } from "../middlewares/auth.js";

const userRoutes = express.Router();

userRoutes.get('/credits',protect, getUserCredits);
userRoutes.post('/project',protect, CreateUserProject);
userRoutes.get('/Project/:projectId',protect, getUserProject);
userRoutes.get('/projects',protect, getUserProjects);
userRoutes.get('/publish-toggle/:projectId',protect, toggleProjectPublish);
userRoutes.post('/purchase-credits',protect, purchaseCredits);


export default userRoutes;