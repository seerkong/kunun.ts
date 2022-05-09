import { TaskQueue } from "../../src/TaskQueue";

const runner = new TaskQueue(3, true);

function taskGenerator(taskName: string, time: number) {
  return {
    name: taskName,
    fn: () =>
      new Promise<String>((resolve, _reject) => {
        setTimeout(() => {
          resolve(`result for task ${taskName}`);
        }, time);
      })
  };
}

const errorTask = {
  name: "errroTask",
  fn: () =>
    new Promise<String>((_resolve, reject) => {
      setTimeout(() => {
        reject("errorTask failed");
      }, 3000);
    })
};

describe("TaskQueue", function() {
    describe("run with errortask", function() {
        it("should return", function() {
            [errorTask]
            .concat(
                [...new Array(5).keys()].map((_value, index) =>
                taskGenerator(String(index), Math.random() * 1000 + 500)
                )
            )
            .forEach(task => runner.addTask(task));
        });
    });
});


