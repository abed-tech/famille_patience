# Generated manually for registration fields

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("members", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Profession",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Créé le")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Modifié le")),
                ("name", models.CharField(max_length=150, unique=True, verbose_name="Nom")),
                ("is_active", models.BooleanField(default=True, verbose_name="Actif")),
            ],
            options={
                "verbose_name": "Profession",
                "verbose_name_plural": "Professions",
                "ordering": ["name"],
            },
        ),
        migrations.AlterField(
            model_name="member",
            name="gender",
            field=models.CharField(
                blank=True,
                choices=[("M", "Masculin"), ("F", "Féminin")],
                max_length=1,
                verbose_name="Sexe",
            ),
        ),
        migrations.AlterField(
            model_name="member",
            name="profession",
            field=models.CharField(blank=True, max_length=150, verbose_name="Profession (texte)"),
        ),
        migrations.AddField(
            model_name="member",
            name="baptism_year",
            field=models.PositiveSmallIntegerField(blank=True, null=True, verbose_name="Année de baptême"),
        ),
        migrations.AddField(
            model_name="member",
            name="icc_modules_completed",
            field=models.BooleanField(default=False, verbose_name="Modules ICC suivis"),
        ),
        migrations.AddField(
            model_name="member",
            name="icc_module_level",
            field=models.CharField(
                blank=True,
                choices=[
                    ("001", "001"),
                    ("101", "101"),
                    ("201", "201"),
                    ("301", "301"),
                    ("401", "401"),
                    ("501", "501"),
                ],
                max_length=3,
                verbose_name="Niveau module ICC",
            ),
        ),
        migrations.AddField(
            model_name="member",
            name="serves_in_church",
            field=models.BooleanField(default=False, verbose_name="Sert dans l'église"),
        ),
        migrations.AddField(
            model_name="member",
            name="serves_in_family",
            field=models.BooleanField(default=False, verbose_name="Sert dans la Famille Patience"),
        ),
        migrations.AddField(
            model_name="member",
            name="profession_ref",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="members",
                to="members.profession",
                verbose_name="Profession",
            ),
        ),
        migrations.AddField(
            model_name="member",
            name="interested_church_department",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="interested_members",
                to="members.churchdepartment",
                verbose_name="Département souhaité (église)",
            ),
        ),
        migrations.AddField(
            model_name="member",
            name="interested_family_pole",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="interested_members",
                to="members.familypole",
                verbose_name="Pôle souhaité (famille)",
            ),
        ),
    ]
