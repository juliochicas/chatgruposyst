import Help from "../../models/Help";
import AppError from "../../errors/AppError";

const ShowService = async (id: string | number, companyId: number): Promise<Help> => {
  const record = await Help.findOne({ where: { id, companyId } });

  if (!record) {
    throw new AppError("ERR_NO_HELP_FOUND", 404);
  }

  return record;
};

export default ShowService;
