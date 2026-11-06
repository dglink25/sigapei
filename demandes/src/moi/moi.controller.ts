import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  Utilisateur,
  UtilisateurCourant,
} from "../common/contexte/utilisateur-courant";
import { ScolariteClient } from "../integrations/scolarite.client";

@ApiTags("Profil")
@ApiBearerAuth()
@Controller()
export class MoiController {
  constructor(private readonly scolarite: ScolariteClient) {}

  @Get("mes-apprenants")
  @ApiOperation({
    summary:
      "Apprenants rattaches au compte (apprenant : son dossier ; parent : ses enfants). Sert a choisir le beneficiaire d'une demande.",
  })
  async mesApprenants(@Utilisateur() u: UtilisateurCourant) {
    if (u.roleCode !== "apprenant" && u.roleCode !== "parent") return [];
    const liste = await this.scolarite.apprenantsDuCompte(
      u.uuid,
      u.roleCode === "parent",
      u.tenantId,
    );
    return liste
      .map((a) => ScolariteClient.resume(a))
      .sort((a, b) =>
        `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, "fr"),
      );
  }
}
