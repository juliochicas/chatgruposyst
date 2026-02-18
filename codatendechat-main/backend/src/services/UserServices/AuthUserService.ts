import User from "../../models/User";
import AppError from "../../errors/AppError";
import {
  createAccessToken,
  createRefreshToken
} from "../../helpers/CreateTokens";
import { SerializeUser } from "../../helpers/SerializeUser";
import Queue from "../../models/Queue";
import Company from "../../models/Company";
import Setting from "../../models/Setting";

interface SerializedUser {
  id: number;
  name: string;
  email: string;
  profile: string;
  queues: Queue[];
  companyId: number;
  companies?: Company[];
}

interface Request {
  email: string;
  password: string;
}

interface Response {
  serializedUser: SerializedUser;
  token: string;
  refreshToken: string;
}

const AuthUserService = async ({
  email,
  password
}: Request): Promise<Response> => {
  const user = await User.findOne({
    where: { email },
    include: [
      "queues",
      { model: Company, as: "company", include: [{ model: Setting }] }
    ]
  });

  if (!user) {
    throw new AppError("ERR_USER_DONT_EXISTS", 401);
  }

  // Load companies separately to avoid duplicate include conflict
  await user.$get("companies", { attributes: ["id", "name"] }).then(companies => {
    user.setDataValue("companies", companies);
  });

  if (!(await user.checkPassword(password))) {
    throw new AppError("ERR_INVALID_CREDENTIALS", 401);
  }

  const token = createAccessToken(user);
  const refreshToken = createRefreshToken(user);

  const serializedUser = await SerializeUser(user);
  // Add companies to serializedUser manually since SerializeUser might not include it
  const userWithCompanies = { ...serializedUser, companies: user.companies };

  return {
    serializedUser: userWithCompanies,
    token,
    refreshToken
  };
};

export default AuthUserService;
