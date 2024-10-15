import { Inherited, HttpGet } from 'fiorite';

@Inherited() class HelloService {
  produceMessage(): string {
    return 'Hello Fiorite!';
  }
}

class HelloController {
  @HttpGet() handleSlash(service: HelloService) {
    return service.produceMessage();
  }
}
