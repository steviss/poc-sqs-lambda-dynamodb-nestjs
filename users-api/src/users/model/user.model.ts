import dynamoose from 'dynamoose';
import { v4 as uuidv4 } from 'uuid';
import { Item } from 'dynamoose/dist/Item';

export class User extends Item {
  id: string;
  name: string;
}

export class UserModel {
  private static schema = new dynamoose.Schema({
    id: {
      type: String,
      default: () => uuidv4(),
      index: {
        name: 'userIdIndex',
        type: 'global',
      },
    },
    name: {
      type: String,
      required: true,
    },
  });

  private static model = dynamoose.model<User>('User', UserModel.schema);

  static async create(name: string): Promise<User> {
    return this.model.create({
      name,
    });
  }

  static async read(id: string): Promise<User> {
    return this.model.get(id);
  }

  static async update(id: string, name: string): Promise<User> {
    return this.model.update({ id, name });
  }

  static async delete(id: string): Promise<boolean> {
    try {
      await this.model.delete(id);
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }
}
