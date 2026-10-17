import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCompanyInput, UpdateCompanyInput } from '@bizznex/shared';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.company.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  create(userId: string, dto: CreateCompanyInput) {
    return this.prisma.company.create({
      data: {
        userId,
        name: dto.name,
        industry: dto.industry ?? '',
        website: dto.website ?? '',
      },
    });
  }

  private async assertOwned(userId: string, id: string) {
    const company = await this.prisma.company.findFirst({ where: { id, userId } });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async update(userId: string, id: string, dto: UpdateCompanyInput) {
    await this.assertOwned(userId, id);
    return this.prisma.company.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.industry !== undefined ? { industry: dto.industry } : {}),
        ...(dto.website !== undefined ? { website: dto.website } : {}),
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwned(userId, id);
    await this.prisma.company.delete({ where: { id } });
    return { ok: true };
  }
}
