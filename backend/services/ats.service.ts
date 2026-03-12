import { AtsRepository } from "@backend/repositories/ats.repository";

export class AtsService {
  constructor(private readonly repo = new AtsRepository()) {}

  pipeline() {
    return this.repo.pipeline();
  }

  listCandidates(q = "") {
    return this.repo.listCandidates(q.trim());
  }
}
